from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.database import get_db
from app.models.invoice import Invoice, Payment
from app.models.deal import Deal
from app.models.customer import Customer
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


class RecordPaymentRequest(BaseModel):
    amount: float
    method: str = "bank_transfer"


@router.get("/invoices")
@router.get("/")
async def list_invoices(
    status: Optional[str] = Query(None, description="Filter by status (paid, unpaid, overdue)"),
    customer_id: Optional[UUID] = Query(None, description="Filter by customer"),
    search: Optional[str] = Query(None, description="Search by invoice number"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Invoice, Deal.deal_number, Customer.name.label("customer_name"), Customer.tier.label("customer_tier"))
        .join(Deal, Invoice.deal_id == Deal.id)
        .join(Customer, Invoice.customer_id == Customer.id)
    )

    if status:
        query = query.where(Invoice.status == status.lower())
    if customer_id:
        query = query.where(Invoice.customer_id == customer_id)
    if search:
        query = query.where(Invoice.invoice_number.ilike(f"%{search}%"))

    total_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit).order_by(Invoice.created_at.desc())
    result = await db.execute(query)
    rows = result.all()

    items = []
    for inv, deal_no, cust_name, cust_tier in rows:
        items.append({
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "deal_id": str(inv.deal_id),
            "deal_number": deal_no,
            "customer_id": str(inv.customer_id),
            "customer_name": cust_name,
            "customer_tier": cust_tier.value if hasattr(cust_tier, "value") else str(cust_tier),
            "amount": inv.amount,
            "status": inv.status,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items,
    }


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Invoice, Deal.deal_number, Customer.name.label("customer_name"), Customer.email.label("customer_email"))
        .join(Deal, Invoice.deal_id == Deal.id)
        .join(Customer, Invoice.customer_id == Customer.id)
        .where(Invoice.id == invoice_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")

    inv, deal_no, cust_name, cust_email = row

    payments_res = await db.execute(
        select(Payment).where(Payment.invoice_id == inv.id).order_by(Payment.created_at.desc())
    )
    payments = payments_res.scalars().all()

    return {
        "id": str(inv.id),
        "invoice_number": inv.invoice_number,
        "deal_id": str(inv.deal_id),
        "deal_number": deal_no,
        "customer_id": str(inv.customer_id),
        "customer_name": cust_name,
        "customer_email": cust_email,
        "amount": inv.amount,
        "status": inv.status,
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "payments": [
            {
                "id": str(p.id),
                "amount": p.amount,
                "method": p.method,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in payments
        ],
    }


@router.post("/invoices/{invoice_id}/payments")
async def record_payment(
    invoice_id: UUID,
    payload: RecordPaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv_res = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    inv = inv_res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    payment = Payment(
        invoice_id=inv.id,
        amount=payload.amount,
        method=payload.method,
    )
    db.add(payment)

    # Check total payments recorded
    payments_res = await db.execute(select(func.sum(Payment.amount)).where(Payment.invoice_id == inv.id))
    total_paid = (payments_res.scalar() or 0) + payload.amount

    if total_paid >= inv.amount:
        inv.status = "paid"
        inv.paid_at = datetime.utcnow()

    await db.commit()
    await db.refresh(payment)

    return {
        "payment_id": str(payment.id),
        "invoice_id": str(inv.id),
        "amount": payment.amount,
        "invoice_status": inv.status,
        "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
    }


@router.get("/payments")
async def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Payment, Invoice.invoice_number, Invoice.deal_id)
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .offset(skip)
        .limit(limit)
        .order_by(Payment.created_at.desc())
    )
    result = await db.execute(query)
    rows = result.all()

    return {
        "items": [
            {
                "id": str(pay.id),
                "invoice_id": str(pay.invoice_id),
                "invoice_number": inv_no,
                "deal_id": str(deal_id),
                "amount": pay.amount,
                "method": pay.method,
                "created_at": pay.created_at.isoformat() if pay.created_at else None,
            }
            for pay, inv_no, deal_id in rows
        ]
    }