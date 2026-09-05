from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import calendar
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.subscription import Subscription, BillingSchedule
from app.models.deal import Deal
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice
from app.models.audit import AuditEvent
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


class CreateSubscriptionRequest(BaseModel):
    deal_id: UUID
    customer_id: UUID
    product_id: UUID
    plan_name: str
    cycle: str = "monthly"  # monthly, quarterly, yearly
    amount: float
    start_date: Optional[datetime] = None


class CancelSubscriptionRequest(BaseModel):
    reason: Optional[str] = "Customer requested cancellation"
    immediate: bool = True  # If true, calculates prorated refund/credit note for unused days


class ModifyQuantityRequest(BaseModel):
    new_quantity: int = Field(..., ge=1)
    unit_price: Optional[float] = None
    reason: Optional[str] = "Mid-cycle plan adjustment"


def get_cycle_days(cycle: str) -> int:
    c = cycle.lower()
    if c == "yearly" or c == "annual":
        return 365
    elif c == "quarterly":
        return 90
    return 30


@router.get("/")
async def list_subscriptions(
    customer_id: Optional[UUID] = Query(None, description="Filter by customer"),
    deal_id: Optional[UUID] = Query(None, description="Filter by deal"),
    status: Optional[str] = Query(None, description="Filter by status (active, cancelled, modified)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Subscription, Customer.name.label("customer_name"), Product.name.label("product_name"), Deal.deal_number)
        .join(Customer, Subscription.customer_id == Customer.id)
        .join(Product, Subscription.product_id == Product.id)
        .join(Deal, Subscription.deal_id == Deal.id)
    )

    if customer_id:
        query = query.where(Subscription.customer_id == customer_id)
    if deal_id:
        query = query.where(Subscription.deal_id == deal_id)
    if status:
        query = query.where(Subscription.status == status.lower())

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0

    query = query.offset(skip).limit(limit).order_by(Subscription.created_at.desc())
    result = await db.execute(query)
    rows = result.all()

    items = []
    for sub, cust_name, prod_name, deal_no in rows:
        items.append({
            "id": str(sub.id),
            "deal_id": str(sub.deal_id),
            "deal_number": deal_no,
            "customer_id": str(sub.customer_id),
            "customer_name": cust_name,
            "product_id": str(sub.product_id),
            "product_name": prod_name,
            "plan_name": sub.plan_name,
            "cycle": sub.cycle,
            "amount": sub.amount,
            "status": sub.status,
            "next_billing_date": sub.next_billing_date.isoformat() if sub.next_billing_date else None,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
        })

    return {"total": total, "items": items}


@router.get("/{subscription_id}")
async def get_subscription_detail(
    subscription_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Subscription, Customer.name.label("customer_name"), Product.name.label("product_name"), Deal.deal_number)
        .join(Customer, Subscription.customer_id == Customer.id)
        .join(Product, Subscription.product_id == Product.id)
        .join(Deal, Subscription.deal_id == Deal.id)
        .where(Subscription.id == subscription_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Subscription not found")

    sub, cust_name, prod_name, deal_no = row

    schedules_res = await db.execute(
        select(BillingSchedule).where(BillingSchedule.subscription_id == sub.id).order_by(BillingSchedule.billing_date.asc())
    )
    schedules = schedules_res.scalars().all()

    return {
        "id": str(sub.id),
        "deal_id": str(sub.deal_id),
        "deal_number": deal_no,
        "customer_id": str(sub.customer_id),
        "customer_name": cust_name,
        "product_id": str(sub.product_id),
        "product_name": prod_name,
        "plan_name": sub.plan_name,
        "cycle": sub.cycle,
        "amount": sub.amount,
        "status": sub.status,
        "next_billing_date": sub.next_billing_date.isoformat() if sub.next_billing_date else None,
        "created_at": sub.created_at.isoformat() if sub.created_at else None,
        "billing_schedules": [
            {
                "id": str(sch.id),
                "billing_date": sch.billing_date.isoformat(),
                "amount": sch.amount,
                "status": sch.status,
            }
            for sch in schedules
        ],
    }


@router.post("/")
async def create_subscription(
    payload: CreateSubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start = payload.start_date or datetime.utcnow()
    cycle_days = get_cycle_days(payload.cycle)
    next_billing = start + timedelta(days=cycle_days)

    sub = Subscription(
        id=uuid4(),
        deal_id=payload.deal_id,
        customer_id=payload.customer_id,
        product_id=payload.product_id,
        plan_name=payload.plan_name,
        cycle=payload.cycle,
        amount=payload.amount,
        status="active",
        next_billing_date=next_billing,
    )
    db.add(sub)
    await db.flush()

    # Generate next 3 billing schedule slots
    for i in range(1, 4):
        sch = BillingSchedule(
            id=uuid4(),
            subscription_id=sub.id,
            billing_date=start + timedelta(days=cycle_days * i),
            amount=payload.amount,
            status="pending",
        )
        db.add(sch)

    await db.commit()
    await db.refresh(sub)
    return {
        "status": "success",
        "subscription_id": str(sub.id),
        "plan_name": sub.plan_name,
        "amount": sub.amount,
        "next_billing_date": sub.next_billing_date.isoformat() if sub.next_billing_date else None,
    }


@router.post("/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: UUID,
    payload: CancelSubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cancels subscription mid-cycle with exact automated day-rate proration calculation,
    credit note issuance, and upcoming schedule cleanup.
    """
    res = await db.execute(select(Subscription).where(Subscription.id == subscription_id))
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if sub.status == "cancelled":
        raise HTTPException(status_code=400, detail="Subscription is already cancelled")

    now = datetime.utcnow()
    next_billing = sub.next_billing_date or (now + timedelta(days=30))
    cycle_days = get_cycle_days(sub.cycle)
    
    # Calculate days remaining in current billing cycle
    days_remaining = max((next_billing.replace(tzinfo=None) - now).days, 0)
    days_used = max(cycle_days - days_remaining, 0)
    
    daily_rate = sub.amount / float(cycle_days)
    prorated_refund = round(daily_rate * days_remaining, 2)

    sub.status = "cancelled"
    sub.next_billing_date = None

    # Cancel pending future billing schedules
    sch_res = await db.execute(
        select(BillingSchedule).where(
            (BillingSchedule.subscription_id == sub.id) & (BillingSchedule.status == "pending")
        )
    )
    for sch in sch_res.scalars().all():
        sch.status = "cancelled"

    # Issue Credit Note Invoice if refund applies
    credit_note = None
    if payload.immediate and prorated_refund > 0:
        inv_count = (await db.execute(select(func.count(Invoice.id)))).scalar() or 0
        credit_note = Invoice(
            id=uuid4(),
            invoice_number=f"CN-{inv_count + 7001}",
            deal_id=sub.deal_id,
            customer_id=sub.customer_id,
            amount=-prorated_refund,  # Negative invoice = Credit Note
            status="issued",
            due_date=now,
            paid_at=now,
        )
        db.add(credit_note)

    audit = AuditEvent(
        id=uuid4(),
        entity_type="subscription",
        entity_id=sub.id,
        action="cancelled",
        user_id=current_user.id,
        new_value=f'{{"status":"cancelled","prorated_refund":{prorated_refund},"days_remaining":{days_remaining}}}',
        reason=payload.reason or "Subscription cancelled mid-cycle",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(sub)

    return {
        "status": "cancelled",
        "subscription_id": str(sub.id),
        "plan_name": sub.plan_name,
        "proration_summary": {
            "cycle_total_days": cycle_days,
            "days_used": days_used,
            "days_remaining": days_remaining,
            "daily_rate": round(daily_rate, 2),
            "prorated_credit_amount": prorated_refund,
        },
        "credit_note": {
            "id": str(credit_note.id),
            "invoice_number": credit_note.invoice_number,
            "amount": credit_note.amount,
        } if credit_note else None,
        "message": f"Subscription cancelled successfully. Credit note for ₹{prorated_refund:,.2f} generated for {days_remaining} unused days.",
    }


@router.post("/{subscription_id}/modify-quantity")
async def modify_subscription_quantity(
    subscription_id: UUID,
    payload: ModifyQuantityRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Modifies subscription quantity mid-cycle.
    Calculates proration delta for the remainder of the current cycle and updates future billing schedules.
    """
    res = await db.execute(select(Subscription).where(Subscription.id == subscription_id))
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if sub.status != "active":
        raise HTTPException(status_code=400, detail="Cannot modify a non-active subscription")

    now = datetime.utcnow()
    next_billing = sub.next_billing_date or (now + timedelta(days=30))
    cycle_days = get_cycle_days(sub.cycle)
    days_remaining = max((next_billing.replace(tzinfo=None) - now).days, 0)

    # Calculate new cycle amount
    old_amount = sub.amount
    unit_price = payload.unit_price if payload.unit_price is not None else (old_amount)
    new_amount = round(unit_price * payload.new_quantity, 2)
    
    amount_delta = new_amount - old_amount
    prorated_delta = round((amount_delta / float(cycle_days)) * days_remaining, 2)

    sub.amount = new_amount
    sub.status = "modified"

    # Update upcoming billing schedules
    sch_res = await db.execute(
        select(BillingSchedule).where(
            (BillingSchedule.subscription_id == sub.id) & (BillingSchedule.status == "pending")
        )
    )
    for sch in sch_res.scalars().all():
        sch.amount = new_amount

    # If proration requires immediate adjustment invoice/credit note
    adjustment_invoice = None
    if prorated_delta != 0:
        inv_count = (await db.execute(select(func.count(Invoice.id)))).scalar() or 0
        inv_type = "INV" if prorated_delta > 0 else "CN"
        adjustment_invoice = Invoice(
            id=uuid4(),
            invoice_number=f"{inv_type}-ADJ-{inv_count + 8001}",
            deal_id=sub.deal_id,
            customer_id=sub.customer_id,
            amount=prorated_delta,
            status="unpaid" if prorated_delta > 0 else "issued",
            due_date=now + timedelta(days=7) if prorated_delta > 0 else now,
        )
        db.add(adjustment_invoice)

    audit = AuditEvent(
        id=uuid4(),
        entity_type="subscription",
        entity_id=sub.id,
        action="modified_quantity",
        user_id=current_user.id,
        new_value=f'{{"new_quantity":{payload.new_quantity},"new_amount":{new_amount},"prorated_delta":{prorated_delta}}}',
        reason=payload.reason or f"Subscription modified to quantity {payload.new_quantity}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(sub)

    return {
        "status": "success",
        "subscription_id": str(sub.id),
        "new_amount": new_amount,
        "old_amount": old_amount,
        "proration_summary": {
            "cycle_total_days": cycle_days,
            "days_remaining": days_remaining,
            "prorated_adjustment_amount": prorated_delta,
        },
        "adjustment_invoice": {
            "id": str(adjustment_invoice.id),
            "invoice_number": adjustment_invoice.invoice_number,
            "amount": adjustment_invoice.amount,
            "status": adjustment_invoice.status,
        } if adjustment_invoice else None,
        "message": f"Subscription updated to ₹{new_amount:,.2f}/cycle with prorated adjustment of ₹{prorated_delta:,.2f}.",
    }