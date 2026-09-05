from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.quote import Quote, QuoteLine
from app.models.deal import Deal, DealStatus
from app.models.customer import Customer, CustomerTier
from app.models.product import Product, ProductCategory
from app.models.approval import Approval, ApprovalStatus, ApprovalStep
from app.models.audit import AuditEvent
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.core.policies import get_max_discount, get_required_approval_level
from app.services.risk_engine import compute_total_risk
from app.services.upsell_engine import get_upsell_candidates

router = APIRouter()


class QuoteLineInput(BaseModel):
    product_id: UUID
    quantity: int = Field(default=1, ge=1)
    unit_price: Optional[float] = None
    discount_percent: float = Field(default=0.0, ge=0.0, le=100.0)


class CreateQuoteRequest(BaseModel):
    customer_id: UUID
    lines: List[QuoteLineInput]
    deal_id: Optional[UUID] = None  # if attaching a new version to existing deal
    notes: Optional[str] = None


class UpsellSuggestionsRequest(BaseModel):
    customer_id: Optional[UUID] = None
    lines: List[QuoteLineInput]


@router.post("/upsell-suggestions")
async def get_live_upsell_suggestions(
    payload: UpsellSuggestionsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Live upsell/cross-sell suggestions endpoint based on cart items.
    Calculates current cart margin, suggested product margin, and the margin delta if added.
    """
    # Fetch all active products
    prods_res = await db.execute(select(Product).where(Product.is_active == True))
    all_products_raw = prods_res.scalars().all()
    
    products_by_id = {p.id: p for p in all_products_raw}
    all_products_dict = {}
    for p in all_products_raw:
        margin_amt = p.base_price - p.cost
        margin_pct = round((margin_amt / p.base_price) * 100, 2) if p.base_price > 0 else 0.0
        all_products_dict[str(p.id)] = {
            "id": str(p.id),
            "name": p.name,
            "sku": p.sku,
            "category": p.category.value if hasattr(p.category, "value") else str(p.category),
            "base_price": p.base_price,
            "cost": p.cost,
            "margin_amount": margin_amt,
            "margin_percent": margin_pct,
            "is_subscription": p.is_subscription,
            "recurring_interval": p.recurring_interval,
        }

    # Compute current cart totals
    cart_product_names = []
    cart_revenue = 0.0
    cart_cost = 0.0

    for item in payload.lines:
        prod = products_by_id.get(item.product_id)
        if prod:
            cart_product_names.append(prod.name)
            unit_p = item.unit_price if item.unit_price is not None else prod.base_price
            disc_price = unit_p * (1.0 - (item.discount_percent / 100.0))
            cart_revenue += disc_price * item.quantity
            cart_cost += prod.cost * item.quantity

    current_cart_margin_pct = round(((cart_revenue - cart_cost) / cart_revenue) * 100, 2) if cart_revenue > 0 else 0.0

    # Get suggestions from upsell engine
    candidates = get_upsell_candidates(cart_product_names, all_products_dict, min_margin=5.0)

    suggestions = []
    for cand in candidates:
        cand_price = cand["base_price"]
        cand_cost = cand["cost"]
        new_rev = cart_revenue + cand_price
        new_cost = cart_cost + cand_cost
        new_margin_pct = round(((new_rev - new_cost) / new_rev) * 100, 2) if new_rev > 0 else 0.0
        margin_delta = round(new_margin_pct - current_cart_margin_pct, 2)

        # Promotion tag indicator
        promo_tag = None
        if cand.get("is_subscription"):
            promo_tag = "Recurring High Margin"
        elif cand.get("margin_percent", 0) >= 40:
            promo_tag = "High Profit Margin"
        elif "service" in cand.get("category", ""):
            promo_tag = "Recommended Add-on"

        suggestions.append({
            "product_id": cand["id"],
            "name": cand["name"],
            "sku": cand["sku"],
            "category": cand["category"],
            "base_price": cand["base_price"],
            "cost": cand["cost"],
            "margin_percent": cand["margin_percent"],
            "margin_delta_if_added": margin_delta,
            "promotion_tag": promo_tag,
            "is_subscription": cand.get("is_subscription", False),
        })

    return {
        "current_cart": {
            "total_revenue": round(cart_revenue, 2),
            "total_cost": round(cart_cost, 2),
            "current_margin_percent": current_cart_margin_pct,
            "item_count": len(payload.lines),
        },
        "suggestions": suggestions,
    }


@router.post("/")
async def create_quote_and_deal(
    payload: CreateQuoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Interactive quote creation with dynamic 3-layer blended risk computation,
    per-line discount governance, and automatic route dispatching:
    - If blended risk <= 40 & all lines within discount limits -> Deal status CONFIRMED (auto-approved)
    - If 40 < risk <= 70 -> Routes for Sales Manager approval (Deal status PENDING_APPROVAL)
    - If risk > 70 -> Routes for Finance approval (Deal status PENDING_APPROVAL)
    """
    if not payload.lines:
        raise HTTPException(status_code=400, detail="Quote must contain at least one line item")

    # Fetch customer
    cust_res = await db.execute(select(Customer).where(Customer.id == payload.customer_id))
    customer = cust_res.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer_tier_str = customer.tier.value if hasattr(customer.tier, "value") else str(customer.tier).lower()

    # Fetch products for line items
    product_ids = [line.product_id for line in payload.lines]
    prods_res = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products_by_id = {p.id: p for p in prods_res.scalars().all()}

    missing_prods = set(product_ids) - set(products_by_id.keys())
    if missing_prods:
        raise HTTPException(status_code=400, detail=f"Products not found: {list(missing_prods)}")

    # Process and evaluate each line
    subtotal = 0.0
    total_discount = 0.0
    total_amount = 0.0
    total_cost = 0.0
    tax_amount = 0.0
    processed_lines = []
    risk_engine_lines = []

    for line_in in payload.lines:
        prod = products_by_id[line_in.product_id]
        category_str = prod.category.value if hasattr(prod.category, "value") else str(prod.category).lower()
        
        unit_price = line_in.unit_price if line_in.unit_price is not None else prod.base_price
        base_line_price = unit_price * line_in.quantity
        
        # Determine ceiling discount for this customer tier & product category
        max_disc_allowed = get_max_discount(customer_tier_str, category_str)
        disc_pct = line_in.discount_percent
        line_discount_amount = base_line_price * (disc_pct / 100.0)
        net_line_total = base_line_price - line_discount_amount
        line_cost = prod.cost * line_in.quantity
        line_tax = net_line_total * (prod.tax_percent / 100.0)

        subtotal += base_line_price
        total_discount += line_discount_amount
        total_amount += net_line_total
        total_cost += line_cost
        tax_amount += line_tax

        processed_lines.append({
            "product": prod,
            "quantity": line_in.quantity,
            "unit_price": unit_price,
            "discount_percent": disc_pct,
            "discount_limit": max_disc_allowed,
            "line_total": round(net_line_total, 2),
            "line_cost": round(line_cost, 2),
        })

        risk_engine_lines.append({
            "name": prod.name,
            "category": category_str,
            "discount_percent": disc_pct,
            "quantity": line_in.quantity,
        })

    grand_total = round(total_amount + tax_amount, 2)
    margin_percent = round(((total_amount - total_cost) / total_amount) * 100, 2) if total_amount > 0 else 0.0

    # Deal risk computation
    deal_context = {
        "idle_days": 0,
        "negotiation_rounds": 0,
        "margin_percent": margin_percent,
        "total_amount": total_amount,
    }
    risk_result = compute_total_risk(risk_engine_lines, deal_context, customer_tier_str)
    risk_score = risk_result["total_score"]
    required_approval = risk_result["approval_level"]  # "auto", "sales_manager", "finance"

    # Determine status based on governance rules
    deal_status = DealStatus.CONFIRMED if required_approval == "auto" else DealStatus.PENDING_APPROVAL

    # Create or update Deal
    deal_count_res = await db.execute(select(func.count(Deal.id)))
    deal_index = (deal_count_res.scalar() or 0) + 1001

    if payload.deal_id:
        existing_deal_res = await db.execute(select(Deal).where(Deal.id == payload.deal_id))
        deal = existing_deal_res.scalar_one_or_none()
        if not deal:
            raise HTTPException(status_code=404, detail="Specified Deal not found")
        deal.total_amount = round(total_amount, 2)
        deal.total_cost = round(total_cost, 2)
        deal.margin_percent = margin_percent
        deal.risk_score = risk_score
        deal.status = deal_status
        deal.updated_at = datetime.utcnow()
        deal.last_activity_at = datetime.utcnow()
        if payload.notes:
            deal.notes = payload.notes
    else:
        deal = Deal(
            id=uuid4(),
            deal_number=f"DF-{deal_index}",
            customer_id=customer.id,
            sales_rep_id=current_user.id,
            status=deal_status,
            total_amount=round(total_amount, 2),
            total_cost=round(total_cost, 2),
            margin_percent=margin_percent,
            risk_score=risk_score,
            notes=payload.notes or f"Quotation for {customer.name} with {len(processed_lines)} line items",
        )
        db.add(deal)

    await db.flush()

    # Get quote version
    prev_quotes_res = await db.execute(select(func.count(Quote.id)).where(Quote.deal_id == deal.id))
    version_num = (prev_quotes_res.scalar() or 0) + 1

    quote = Quote(
        id=uuid4(),
        quote_number=f"QT-{deal.deal_number.replace('DF-', '')}-v{version_num}",
        deal_id=deal.id,
        version=version_num,
        subtotal=round(subtotal, 2),
        total_discount=round(total_discount, 2),
        tax_amount=round(tax_amount, 2),
        grand_total=grand_total,
    )
    db.add(quote)
    await db.flush()

    # Add Quote Lines
    for pl in processed_lines:
        ql = QuoteLine(
            id=uuid4(),
            quote_id=quote.id,
            product_id=pl["product"].id,
            quantity=pl["quantity"],
            unit_price=pl["unit_price"],
            discount_percent=pl["discount_percent"],
            discount_limit=pl["discount_limit"],
            line_total=pl["line_total"],
        )
        db.add(ql)

    # Route Approval if required
    approval_obj = None
    if required_approval != "auto":
        approval_obj = Approval(
            id=uuid4(),
            deal_id=deal.id,
            status=ApprovalStatus.PENDING,
            required_level=required_approval,
        )
        db.add(approval_obj)

    # Audit Trail Log
    audit = AuditEvent(
        id=uuid4(),
        entity_type="deal",
        entity_id=deal.id,
        action="quote_created",
        user_id=current_user.id,
        new_value=f'{{"status":"{deal.status.value}","risk_score":{risk_score},"approval":"{required_approval}"}}',
        reason=f"Quote {quote.quote_number} generated (Risk: {risk_score}, Routing: {required_approval})",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(deal)
    await db.refresh(quote)

    return {
        "status": "success",
        "deal": {
            "id": str(deal.id),
            "deal_number": deal.deal_number,
            "status": deal.status.value,
            "total_amount": deal.total_amount,
            "total_cost": deal.total_cost,
            "margin_percent": deal.margin_percent,
            "risk_score": deal.risk_score,
            "required_approval_level": required_approval,
        },
        "quote": {
            "id": str(quote.id),
            "quote_number": quote.quote_number,
            "version": quote.version,
            "subtotal": quote.subtotal,
            "total_discount": quote.total_discount,
            "tax_amount": quote.tax_amount,
            "grand_total": quote.grand_total,
            "lines_count": len(processed_lines),
        },
        "risk_breakdown": risk_result,
        "approval_id": str(approval_obj.id) if approval_obj else None,
        "auto_approved": required_approval == "auto",
    }


@router.get("/")
async def list_quotes(
    deal_id: Optional[UUID] = Query(None, description="Filter quotes by Deal ID"),
    search: Optional[str] = Query(None, description="Search by quote number"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Quote, Deal.deal_number, Customer.name.label("customer_name"))
        .join(Deal, Quote.deal_id == Deal.id)
        .join(Customer, Deal.customer_id == Customer.id)
    )

    if deal_id:
        query = query.where(Quote.deal_id == deal_id)
    if search:
        query = query.where(Quote.quote_number.ilike(f"%{search}%"))

    total_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit).order_by(Quote.created_at.desc())
    result = await db.execute(query)
    rows = result.all()

    items = []
    for quote, deal_number, customer_name in rows:
        items.append({
            "id": str(quote.id),
            "quote_number": quote.quote_number,
            "deal_id": str(quote.deal_id),
            "deal_number": deal_number,
            "customer_name": customer_name,
            "version": quote.version,
            "subtotal": quote.subtotal,
            "total_discount": quote.total_discount,
            "tax_amount": quote.tax_amount,
            "grand_total": quote.grand_total,
            "created_at": quote.created_at.isoformat() if quote.created_at else None,
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items,
    }


@router.get("/{quote_id}")
async def get_quote_detail(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote_res = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = quote_res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    deal_res = await db.execute(
        select(Deal, Customer.name.label("customer_name"), Customer.tier.label("customer_tier"))
        .join(Customer, Deal.customer_id == Customer.id)
        .where(Deal.id == quote.deal_id)
    )
    deal_row = deal_res.first()
    deal = deal_row[0] if deal_row else None
    customer_name = deal_row[1] if deal_row else None
    customer_tier = deal_row[2] if deal_row else None

    lines_res = await db.execute(
        select(QuoteLine, Product.name.label("product_name"), Product.sku.label("product_sku"), Product.category.label("category"))
        .join(Product, QuoteLine.product_id == Product.id)
        .where(QuoteLine.quote_id == quote.id)
    )
    lines_rows = lines_res.all()

    line_items = []
    for line, prod_name, prod_sku, category in lines_rows:
        line_items.append({
            "id": str(line.id),
            "product_id": str(line.product_id),
            "product_name": prod_name,
            "product_sku": prod_sku,
            "category": category.value if hasattr(category, "value") else str(category),
            "quantity": line.quantity,
            "unit_price": line.unit_price,
            "discount_percent": line.discount_percent,
            "discount_limit": line.discount_limit,
            "line_total": line.line_total,
            "discount_exceeded": line.discount_percent > line.discount_limit,
        })

    # Fetch last editor name if edited
    last_editor_name = None
    if quote.last_edited_by:
        user_res = await db.execute(select(User.name).where(User.id == quote.last_edited_by))
        last_editor_name = user_res.scalar_one_or_none()

    # A quote is editable while its deal has not been approved / confirmed / fulfilled / cancelled
    deal_status_val = deal.status.value if deal and hasattr(deal.status, "value") else str(deal.status) if deal else None
    editable = deal_status_val in ("draft", "pending_approval")

    return {
        "id": str(quote.id),
        "quote_number": quote.quote_number,
        "deal_id": str(quote.deal_id),
        "deal_number": deal.deal_number if deal else None,
        "deal_status": deal_status_val,
        "customer_id": str(deal.customer_id) if deal else None,
        "customer_name": customer_name,
        "customer_tier": customer_tier.value if customer_tier and hasattr(customer_tier, "value") else str(customer_tier) if customer_tier else None,
        "version": quote.version,
        "subtotal": quote.subtotal,
        "total_discount": quote.total_discount,
        "tax_amount": quote.tax_amount,
        "grand_total": quote.grand_total,
        "created_at": quote.created_at.isoformat() if quote.created_at else None,
        "editable": editable,
        "edit_count": quote.edit_count or 0,
        "last_edited_by_name": last_editor_name,
        "last_edited_at": quote.last_edited_at.isoformat() if quote.last_edited_at else None,
        "lines": line_items,
    }


@router.get("/deal/{deal_id}")
async def get_quotes_by_deal(
    deal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Quote).where(Quote.deal_id == deal_id).order_by(Quote.version.desc()))
    quotes = result.scalars().all()
    return {
        "deal_id": str(deal_id),
        "quotes": [
            {
                "id": str(q.id),
                "quote_number": q.quote_number,
                "version": q.version,
                "grand_total": q.grand_total,
                "created_at": q.created_at.isoformat() if q.created_at else None,
            }
            for q in quotes
        ]
    }

class EditQuoteRequest(BaseModel):
    """
    Payload for PATCH /quotes/{quote_id}. Updates the quote in-place instead of
    creating a new version. Only valid while the parent deal is still in
    'draft' or 'pending_approval' status.
    """
    lines: List[QuoteLineInput]
    notes: Optional[str] = None


@router.patch("/{quote_id}")
async def edit_quote(
    quote_id: UUID,
    payload: EditQuoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Edit an in-flight quote before it's been approved.

    Behavior:
    - Reads the existing quote and its parent deal.
    - Rejects the edit if the deal is already approved / confirmed / fulfilled / cancelled.
    - Deletes the old QuoteLine rows and inserts fresh ones from the payload
      (no new Quote version is created — this is a true in-place edit).
    - Recomputes totals, margin, risk, and approval routing.
    - Any pre-existing pending Approval is reset (steps cleared, note added) so
      approvers must re-verify from scratch — this matches the "re-verification"
      requirement.
    - Populates quote.last_edited_by, quote.last_edited_at, quote.edit_count.
    - Writes an AuditEvent capturing user, timestamp, and diff summary.
    """
    if not payload.lines:
        raise HTTPException(status_code=400, detail="Quote must contain at least one line item")

    quote_res = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = quote_res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    deal_res = await db.execute(select(Deal).where(Deal.id == quote.deal_id))
    deal = deal_res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Parent deal not found")

    deal_status_val = deal.status.value if hasattr(deal.status, "value") else str(deal.status).lower()
    if deal_status_val not in ("draft", "pending_approval"):
        raise HTTPException(
            status_code=400,
            detail=f"Quote can only be edited while the deal is in draft or pending_approval status (current: {deal_status_val}).",
        )

    # Get customer + product data for recompute
    cust_res = await db.execute(select(Customer).where(Customer.id == deal.customer_id))
    customer = cust_res.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found for this deal")

    customer_tier_str = customer.tier.value if hasattr(customer.tier, "value") else str(customer.tier).lower()

    product_ids = [line.product_id for line in payload.lines]
    prods_res = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products_by_id = {p.id: p for p in prods_res.scalars().all()}
    missing = set(product_ids) - set(products_by_id.keys())
    if missing:
        raise HTTPException(status_code=400, detail=f"Products not found: {list(missing)}")

    # Recompute totals
    subtotal = 0.0
    total_discount = 0.0
    total_amount = 0.0
    total_cost = 0.0
    tax_amount = 0.0
    processed_lines = []
    risk_engine_lines = []

    for line_in in payload.lines:
        prod = products_by_id[line_in.product_id]
        category_str = prod.category.value if hasattr(prod.category, "value") else str(prod.category).lower()
        unit_price = line_in.unit_price if line_in.unit_price is not None else prod.base_price
        base_line_price = unit_price * line_in.quantity
        max_disc_allowed = get_max_discount(customer_tier_str, category_str)
        disc_pct = line_in.discount_percent
        line_discount_amount = base_line_price * (disc_pct / 100.0)
        net_line_total = base_line_price - line_discount_amount
        line_cost = prod.cost * line_in.quantity
        line_tax = net_line_total * (prod.tax_percent / 100.0)

        subtotal += base_line_price
        total_discount += line_discount_amount
        total_amount += net_line_total
        total_cost += line_cost
        tax_amount += line_tax

        processed_lines.append({
            "product": prod, "quantity": line_in.quantity, "unit_price": unit_price,
            "discount_percent": disc_pct, "discount_limit": max_disc_allowed,
            "line_total": round(net_line_total, 2), "line_cost": round(line_cost, 2),
        })
        risk_engine_lines.append({
            "name": prod.name, "category": category_str,
            "discount_percent": disc_pct, "quantity": line_in.quantity,
        })

    grand_total = round(total_amount + tax_amount, 2)
    margin_percent = round(((total_amount - total_cost) / total_amount) * 100, 2) if total_amount > 0 else 0.0

    # Recompute risk & routing
    deal_context = {
        "idle_days": 0,
        "negotiation_rounds": 0,
        "margin_percent": margin_percent,
        "total_amount": total_amount,
    }
    risk_result = compute_total_risk(risk_engine_lines, deal_context, customer_tier_str)
    risk_score = risk_result["total_score"]
    required_approval = risk_result["approval_level"]

    # Capture pre-edit snapshot for audit
    old_snapshot = {
        "grand_total": quote.grand_total,
        "total_discount": quote.total_discount,
        "risk_score": deal.risk_score,
    }

    # Delete existing lines and insert fresh ones (in-place edit — same quote row, same version)
    await db.execute(QuoteLine.__table__.delete().where(QuoteLine.quote_id == quote.id))
    for pl in processed_lines:
        db.add(QuoteLine(
            id=uuid4(), quote_id=quote.id, product_id=pl["product"].id,
            quantity=pl["quantity"], unit_price=pl["unit_price"],
            discount_percent=pl["discount_percent"], discount_limit=pl["discount_limit"],
            line_total=pl["line_total"],
        ))

    # Update quote header
    quote.subtotal = round(subtotal, 2)
    quote.total_discount = round(total_discount, 2)
    quote.tax_amount = round(tax_amount, 2)
    quote.grand_total = grand_total
    quote.last_edited_by = current_user.id
    quote.last_edited_at = datetime.utcnow()
    quote.edit_count = (quote.edit_count or 0) + 1

    # Update deal totals + status + re-route approval
    new_deal_status = DealStatus.PENDING_APPROVAL if required_approval != "auto" else DealStatus.CONFIRMED
    deal.total_amount = round(total_amount, 2)
    deal.total_cost = round(total_cost, 2)
    deal.margin_percent = margin_percent
    deal.risk_score = risk_score
    deal.status = new_deal_status
    deal.updated_at = datetime.utcnow()
    deal.last_activity_at = datetime.utcnow()
    if payload.notes:
        deal.notes = payload.notes

    # Reset any existing pending approval: mark it superseded and create a fresh one so
    # approvers must re-verify from scratch (matches "re-verification" requirement).
    approval_id_out = None
    existing_appr_res = await db.execute(
        select(Approval).where(Approval.deal_id == deal.id, Approval.status == ApprovalStatus.PENDING)
    )
    for old_appr in existing_appr_res.scalars().all():
        old_appr.status = ApprovalStatus.REJECTED  # marks it as superseded
        old_appr.resolved_at = datetime.utcnow()
        # Log the supersede as an approval step so it shows in the approval chain
        db.add(ApprovalStep(
            id=uuid4(),
            approval_id=old_appr.id,
            approver_id=current_user.id,
            action=ApprovalStatus.REJECTED,
            note=f"Superseded by quote edit from {current_user.name}",
        ))

    if required_approval != "auto":
        new_appr = Approval(
            id=uuid4(),
            deal_id=deal.id,
            status=ApprovalStatus.PENDING,
            required_level=required_approval,
        )
        db.add(new_appr)
        await db.flush()
        approval_id_out = str(new_appr.id)

    # Audit log
    db.add(AuditEvent(
        id=uuid4(),
        entity_type="quote",
        entity_id=quote.id,
        action="quote_edited",
        user_id=current_user.id,
        old_value=f'{{"grand_total":{old_snapshot["grand_total"]},"risk_score":{old_snapshot["risk_score"]}}}',
        new_value=f'{{"grand_total":{grand_total},"risk_score":{risk_score},"approval":"{required_approval}"}}',
        reason=f"Quote {quote.quote_number} edited by {current_user.name} (edit #{quote.edit_count}); approval re-triggered → {required_approval}",
    ))

    await db.commit()
    await db.refresh(quote)
    await db.refresh(deal)

    return {
        "status": "success",
        "quote": {
            "id": str(quote.id),
            "quote_number": quote.quote_number,
            "version": quote.version,
            "subtotal": quote.subtotal,
            "total_discount": quote.total_discount,
            "grand_total": quote.grand_total,
            "edit_count": quote.edit_count,
            "last_edited_by_name": current_user.name,
            "last_edited_at": quote.last_edited_at.isoformat(),
        },
        "deal": {
            "id": str(deal.id),
            "deal_number": deal.deal_number,
            "status": deal.status.value,
            "total_amount": deal.total_amount,
            "margin_percent": deal.margin_percent,
            "risk_score": deal.risk_score,
            "required_approval_level": required_approval,
        },
        "approval_id": approval_id_out,
        "auto_approved": required_approval == "auto",
        "message": f"Quote edited — approval re-routed to {required_approval}.",
    }
