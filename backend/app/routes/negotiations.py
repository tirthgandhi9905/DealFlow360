import json
from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.negotiation import Negotiation, NegotiationRound, Concession
from app.models.deal import Deal, DealStatus
from app.models.customer import Customer
from app.models.quote import Quote, QuoteLine
from app.models.product import Product
from app.models.approval import Approval, ApprovalStatus
from app.models.audit import AuditEvent
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.negotiation_engine import generate_counter_proposals
from app.services.risk_engine import compute_total_risk
from app.core.policies import get_max_discount

router = APIRouter()


class CustomerNegotiationRequest(BaseModel):
    customer_request: str
    counter_discount_percent: Optional[float] = None
    line_level_notes: Optional[str] = None


class SelectNegotiationOptionRequest(BaseModel):
    selected_option: str  # e.g., "A", "B", "C" or Option Label
    option_details: Optional[dict] = None


class FinalConfirmQuoteRequest(BaseModel):
    comments: Optional[str] = None


@router.get("/")
async def list_negotiations(
    status: Optional[str] = Query(None, description="Filter by status (open, closed)"),
    deal_id: Optional[UUID] = Query(None, description="Filter by deal"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    query = (
        select(Negotiation, Deal.deal_number, Deal.total_amount, Deal.margin_percent, Customer.name.label("customer_name"), Customer.tier.label("customer_tier"))
        .join(Deal, Negotiation.deal_id == Deal.id)
        .join(Customer, Deal.customer_id == Customer.id)
    )

    if status:
        query = query.where(Negotiation.status == status.lower())
    if deal_id:
        query = query.where(Negotiation.deal_id == deal_id)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0

    query = query.order_by(Negotiation.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    items = []
    for neg, deal_no, amount, margin, cust_name, cust_tier in rows:
        # Fetch concession budget
        conc_res = await db.execute(select(Concession).where(Concession.deal_id == neg.deal_id))
        conc = conc_res.scalars().first()

        items.append({
            "id": str(neg.id),
            "deal_id": str(neg.deal_id),
            "deal_number": deal_no,
            "customer_name": cust_name,
            "customer_tier": cust_tier.value if hasattr(cust_tier, "value") else str(cust_tier),
            "round_count": int(neg.round_count) if str(neg.round_count).isdigit() else 1,
            "status": neg.status,
            "deal_amount": amount,
            "deal_margin": margin,
            "concession_budget": {
                "total": conc.total_budget if conc else round(amount * 0.08, 2),
                "used": conc.used_amount if conc else 0.0,
                "remaining": conc.remaining if conc else round(amount * 0.08, 2),
            },
            "created_at": neg.created_at.isoformat() if neg.created_at else None,
        })

    return {"total": total, "items": items}


@router.get("/portal/quote/{quote_id}")
async def get_portal_quote_view(
    quote_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Customer-facing restricted portal view (no authentication required / public access token safe).
    Displays quote line items, totals, negotiation status, and previous rounds without leaking internal costs/margins.
    """
    quote_res = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = quote_res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    deal_res = await db.execute(
        select(Deal, Customer.name.label("customer_name"), Customer.email.label("customer_email"))
        .join(Customer, Deal.customer_id == Customer.id)
        .where(Deal.id == quote.deal_id)
    )
    deal_row = deal_res.first()
    deal = deal_row[0] if deal_row else None
    customer_name = deal_row[1] if deal_row else None

    # Get lines
    lines_res = await db.execute(
        select(QuoteLine, Product.name.label("product_name"), Product.sku.label("product_sku"), Product.description)
        .join(Product, QuoteLine.product_id == Product.id)
        .where(QuoteLine.quote_id == quote.id)
    )
    lines = lines_res.all()

    # Get negotiation and rounds
    neg_res = await db.execute(select(Negotiation).where(Negotiation.deal_id == quote.deal_id))
    negotiation = neg_res.scalars().first()

    rounds_data = []
    if negotiation:
        rounds_res = await db.execute(
            select(NegotiationRound).where(NegotiationRound.negotiation_id == negotiation.id).order_by(NegotiationRound.created_at.asc())
        )
        for r in rounds_res.scalars().all():
            options = []
            if r.proposed_options:
                try:
                    options = json.loads(r.proposed_options)
                except Exception:
                    options = [{"label": r.proposed_options}]
            rounds_data.append({
                "round_number": r.round_number,
                "customer_request": r.customer_request,
                "proposed_options": options,
                "selected_option": r.selected_option,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })

    return {
        "quote_id": str(quote.id),
        "quote_number": quote.quote_number,
        "deal_number": deal.deal_number if deal else None,
        "customer_name": customer_name,
        "deal_status": deal.status.value if deal and hasattr(deal.status, "value") else str(deal.status) if deal else None,
        "subtotal": quote.subtotal,
        "total_discount": quote.total_discount,
        "tax_amount": quote.tax_amount,
        "grand_total": quote.grand_total,
        "lines": [
            {
                "id": str(ql.id),
                "product_name": p_name,
                "product_sku": p_sku,
                "description": desc,
                "quantity": ql.quantity,
                "unit_price": ql.unit_price,
                "discount_percent": ql.discount_percent,
                "line_total": ql.line_total,
            }
            for ql, p_name, p_sku, desc in lines
        ],
        "negotiation": {
            "is_open": negotiation.status == "open" if negotiation else False,
            "round_count": int(negotiation.round_count) if negotiation and str(negotiation.round_count).isdigit() else 0,
            "rounds": rounds_data,
        } if negotiation else None,
    }


@router.post("/portal/quote/{quote_id}/submit-request")
async def portal_submit_negotiation_request(
    quote_id: UUID,
    payload: CustomerNegotiationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Customer submits a line-level request, counter discount proposal, or terms change.
    Generates 3 Pareto-optimal counter-options instantly via the Negotiation Engine.
    """
    quote_res = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = quote_res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    deal_res = await db.execute(select(Deal).where(Deal.id == quote.deal_id))
    deal = deal_res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    cust_res = await db.execute(select(Customer).where(Customer.id == deal.customer_id))
    customer = cust_res.scalar_one_or_none()
    cust_tier_str = customer.tier.value if customer and hasattr(customer.tier, "value") else "bronze"

    # Fetch or create Negotiation session
    neg_res = await db.execute(select(Negotiation).where(Negotiation.deal_id == deal.id))
    negotiation = neg_res.scalars().first()
    if not negotiation:
        negotiation = Negotiation(id=uuid4(), deal_id=deal.id, round_count="0", status="open")
        db.add(negotiation)
        await db.flush()

    # Fetch concession budget
    conc_res = await db.execute(select(Concession).where(Concession.deal_id == deal.id))
    concession = conc_res.scalars().first()
    if not concession:
        concession = Concession(
            id=uuid4(),
            deal_id=deal.id,
            total_budget=round(deal.total_amount * 0.08, 2),
            used_amount=0.0,
            remaining=round(deal.total_amount * 0.08, 2),
        )
        db.add(concession)
        await db.flush()

    current_round = int(negotiation.round_count) + 1 if str(negotiation.round_count).isdigit() else 1
    negotiation.round_count = str(current_round)
    negotiation.status = "open"
    deal.status = DealStatus.NEGOTIATION

    # Generate 3 AI counter proposals
    proposals = await generate_counter_proposals(
        customer_request=payload.customer_request,
        deal_context=f"Deal {deal.deal_number}, Amount: ₹{deal.total_amount:,.2f}, Margin: {deal.margin_percent}%",
        customer_history=f"Customer: {customer.name if customer else 'Client'}, Tier: {cust_tier_str}",
        policies="Discount ceilings: Gold 15%, Silver 10%, Bronze 5%",
        concession_budget=concession.remaining,
        deal_total=deal.total_amount,
        current_margin=deal.margin_percent,
        customer_tier=cust_tier_str,
    )

    round_record = NegotiationRound(
        id=uuid4(),
        negotiation_id=negotiation.id,
        round_number=str(current_round),
        customer_request=f"{payload.customer_request}" + (f" (Counter: {payload.counter_discount_percent}%)" if payload.counter_discount_percent else ""),
        proposed_options=json.dumps(proposals),
    )
    db.add(round_record)

    # Audit log
    audit = AuditEvent(
        id=uuid4(),
        entity_type="deal",
        entity_id=deal.id,
        action="negotiation_request",
        user_id=deal.sales_rep_id,
        new_value=f'{{"round":{current_round},"status":"negotiation"}}',
        reason=f"Customer submitted negotiation request: {payload.customer_request[:80]}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(round_record)

    return {
        "status": "success",
        "round_number": current_round,
        "round_id": str(round_record.id),
        "customer_request": payload.customer_request,
        "counter_options": proposals,
    }


@router.post("/portal/quote/{quote_id}/select-option")
async def portal_select_negotiation_option(
    quote_id: UUID,
    payload: SelectNegotiationOptionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Customer or Sales Rep selects one of the 3 proposed negotiation counter options.
    """
    quote_res = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = quote_res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    neg_res = await db.execute(select(Negotiation).where(Negotiation.deal_id == quote.deal_id))
    negotiation = neg_res.scalars().first()
    if not negotiation:
        raise HTTPException(status_code=404, detail="Negotiation session not found")

    round_res = await db.execute(
        select(NegotiationRound)
        .where(NegotiationRound.negotiation_id == negotiation.id)
        .order_by(NegotiationRound.created_at.desc())
    )
    latest_round = round_res.scalars().first()
    if latest_round:
        latest_round.selected_option = payload.selected_option
        await db.commit()

    return {
        "status": "success",
        "selected_option": payload.selected_option,
        "message": f"Option '{payload.selected_option}' recorded for Round {latest_round.round_number if latest_round else 1}.",
    }


@router.post("/portal/quote/{quote_id}/confirm")
async def portal_confirm_quote(
    quote_id: UUID,
    payload: FinalConfirmQuoteRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Customer confirms the final quotation terms with one click.
    If the negotiated terms exceed discount thresholds, the quote automatically RE-ENTERS the approval chain.
    Otherwise, moves straight to CONFIRMED (ready for fulfillment).
    """
    quote_res = await db.execute(select(Quote).where(Quote.id == quote_id))
    quote = quote_res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    deal_res = await db.execute(select(Deal).where(Deal.id == quote.deal_id))
    deal = deal_res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    cust_res = await db.execute(select(Customer).where(Customer.id == deal.customer_id))
    customer = cust_res.scalar_one_or_none()
    cust_tier_str = customer.tier.value if customer and hasattr(customer.tier, "value") else "bronze"

    # Check lines against discount policies
    lines_res = await db.execute(
        select(QuoteLine, Product.category, Product.name)
        .join(Product, QuoteLine.product_id == Product.id)
        .where(QuoteLine.quote_id == quote.id)
    )
    lines = lines_res.all()

    risk_lines = []
    has_violation = False
    for ql, cat, name in lines:
        cat_str = cat.value if hasattr(cat, "value") else str(cat).lower()
        limit = get_max_discount(cust_tier_str, cat_str)
        if ql.discount_percent > limit:
            has_violation = True
        risk_lines.append({
            "name": name,
            "category": cat_str,
            "discount_percent": ql.discount_percent,
        })

    risk_res = compute_total_risk(
        risk_lines,
        {"idle_days": 0, "negotiation_rounds": 2, "margin_percent": deal.margin_percent, "total_amount": deal.total_amount},
        cust_tier_str,
    )
    risk_score = risk_res["total_score"]
    approval_level = risk_res["approval_level"]

    # Close negotiation
    neg_res = await db.execute(select(Negotiation).where(Negotiation.deal_id == deal.id))
    negotiation = neg_res.scalars().first()
    if negotiation:
        negotiation.status = "closed"

    re_routed_to_approval = False
    approval_id = None

    if approval_level != "auto" or has_violation:
        # Auto re-enters approval chain
        deal.status = DealStatus.PENDING_APPROVAL
        re_routed_to_approval = True
        appr = Approval(
            id=uuid4(),
            deal_id=deal.id,
            status=ApprovalStatus.PENDING,
            required_level=approval_level if approval_level != "auto" else "sales_manager",
        )
        db.add(appr)
        await db.flush()
        approval_id = str(appr.id)
    else:
        # Move directly to confirmed
        deal.status = DealStatus.CONFIRMED

    deal.updated_at = datetime.utcnow()

    # Audit log
    audit = AuditEvent(
        id=uuid4(),
        entity_type="deal",
        entity_id=deal.id,
        action="portal_confirmed",
        user_id=deal.sales_rep_id,
        new_value=f'{{"status":"{deal.status.value}","re_approval":{re_routed_to_approval}}}',
        reason=payload.comments or f"Customer confirmed terms from portal. Re-routed to approval: {re_routed_to_approval}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(deal)

    return {
        "status": "success",
        "deal_status": deal.status.value,
        "re_routed_to_approval": re_routed_to_approval,
        "approval_id": approval_id,
        "message": "Quotation confirmed! Re-routed for Manager/Finance approval because terms exceeded threshold." if re_routed_to_approval else "Quotation confirmed and moved directly to fulfillment.",
    }