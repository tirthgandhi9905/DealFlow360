from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.models.customer import Customer, CustomerTier
from app.auth.dependencies import get_current_user, require_role
from app.models.user import User, UserRole

router = APIRouter()


class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    tier: CustomerTier = CustomerTier.BRONZE
    address: Optional[str] = None
    industry: Optional[str] = None
    lifetime_value: float = 0.0


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    tier: Optional[CustomerTier] = None
    address: Optional[str] = None
    industry: Optional[str] = None
    lifetime_value: Optional[float] = None


@router.get("/")
async def list_customers(
    tier: Optional[CustomerTier] = Query(None, description="Filter by customer tier"),
    search: Optional[str] = Query(None, description="Search by name, email, or industry"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Customer)
    if tier:
        query = query.where(Customer.tier == tier)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Customer.name.ilike(search_pattern),
                Customer.email.ilike(search_pattern),
                Customer.industry.ilike(search_pattern),
            )
        )
    
    total_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(total_query)
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit).order_by(Customer.created_at.desc())
    result = await db.execute(query)
    customers = result.scalars().all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": str(c.id),
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "tier": c.tier.value if hasattr(c.tier, "value") else str(c.tier),
                "address": c.address,
                "industry": c.industry,
                "lifetime_value": c.lifetime_value,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in customers
        ],
    }


@router.get("/{customer_id}")
async def get_customer(
    customer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    return {
        "id": str(customer.id),
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "tier": customer.tier.value if hasattr(customer.tier, "value") else str(customer.tier),
        "address": customer.address,
        "industry": customer.industry,
        "lifetime_value": customer.lifetime_value,
        "created_at": customer.created_at.isoformat() if customer.created_at else None,
        "updated_at": customer.updated_at.isoformat() if customer.updated_at else None,
    }


@router.post("/")
async def create_customer(
    data: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_REP)),
):
    existing = await db.execute(select(Customer).where(Customer.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Customer with this email already exists")

    customer = Customer(
        name=data.name,
        email=data.email,
        phone=data.phone,
        tier=data.tier,
        address=data.address,
        industry=data.industry,
        lifetime_value=data.lifetime_value,
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)

    return {
        "id": str(customer.id),
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "tier": customer.tier.value if hasattr(customer.tier, "value") else str(customer.tier),
        "address": customer.address,
        "industry": customer.industry,
        "lifetime_value": customer.lifetime_value,
        "created_at": customer.created_at.isoformat() if customer.created_at else None,
    }


@router.patch("/{customer_id}")
async def update_customer(
    customer_id: UUID,
    data: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_REP)),
):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = data.model_dump(exclude_unset=True)
    if "email" in update_data and update_data["email"] != customer.email:
        existing = await db.execute(select(Customer).where(Customer.email == update_data["email"]))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Customer with this email already exists")

    for key, value in update_data.items():
        setattr(customer, key, value)

    await db.commit()
    await db.refresh(customer)

    return {
        "id": str(customer.id),
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "tier": customer.tier.value if hasattr(customer.tier, "value") else str(customer.tier),
        "address": customer.address,
        "industry": customer.industry,
        "lifetime_value": customer.lifetime_value,
        "updated_at": customer.updated_at.isoformat() if customer.updated_at else None,
    }


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    await db.delete(customer)
    await db.commit()
    return {"status": "success", "message": f"Customer {customer_id} deleted"}

@router.get("/{customer_id}/summary")
async def get_customer_summary(
    customer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Customer 360° summary — one endpoint that returns everything about a customer
    for the "Customer Detail" dashboard: profile, aggregated stats, and their
    complete deal / quote / negotiation / invoice history.
    """
    from app.models.deal import Deal, DealStatus
    from app.models.quote import Quote
    from app.models.invoice import Invoice
    from app.models.negotiation import Negotiation

    # Customer profile
    cust_res = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = cust_res.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # All deals with sales rep name
    deals_res = await db.execute(
        select(Deal, User.name.label("rep_name"))
        .join(User, Deal.sales_rep_id == User.id)
        .where(Deal.customer_id == customer_id)
        .order_by(Deal.created_at.desc())
    )
    deals_rows = deals_res.all()
    deals = [
        {
            "id": str(d.id),
            "deal_number": d.deal_number,
            "status": d.status.value if hasattr(d.status, "value") else str(d.status),
            "total_amount": d.total_amount,
            "margin_percent": d.margin_percent,
            "risk_score": d.risk_score,
            "sales_rep_name": rep_name,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "last_activity_at": d.last_activity_at.isoformat() if d.last_activity_at else None,
        }
        for d, rep_name in deals_rows
    ]

    # All quotes for this customer's deals
    if deals:
        deal_ids = [UUID(d["id"]) for d in deals]
        quotes_res = await db.execute(
            select(Quote).where(Quote.deal_id.in_(deal_ids)).order_by(Quote.created_at.desc())
        )
        deal_no_by_id = {UUID(d["id"]): d["deal_number"] for d in deals}
        quotes = [
            {
                "id": str(q.id),
                "quote_number": q.quote_number,
                "deal_id": str(q.deal_id),
                "deal_number": deal_no_by_id.get(q.deal_id),
                "version": q.version,
                "grand_total": q.grand_total,
                "edit_count": q.edit_count or 0,
                "created_at": q.created_at.isoformat() if q.created_at else None,
            }
            for q in quotes_res.scalars().all()
        ]

        # All negotiations
        negs_res = await db.execute(
            select(Negotiation).where(Negotiation.deal_id.in_(deal_ids)).order_by(Negotiation.created_at.desc())
        )
        negotiations = [
            {
                "id": str(n.id),
                "deal_id": str(n.deal_id),
                "deal_number": deal_no_by_id.get(n.deal_id),
                "status": n.status,
                "round_count": n.round_count,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in negs_res.scalars().all()
        ]

        # All invoices
        invs_res = await db.execute(
            select(Invoice).where(Invoice.customer_id == customer_id).order_by(Invoice.due_date.desc())
        )
        invoices = [
            {
                "id": str(i.id),
                "invoice_number": i.invoice_number,
                "deal_id": str(i.deal_id),
                "amount": i.amount,
                "status": i.status,
                "due_date": i.due_date.isoformat() if i.due_date else None,
                "paid_at": i.paid_at.isoformat() if i.paid_at else None,
            }
            for i in invs_res.scalars().all()
        ]
    else:
        quotes, negotiations, invoices = [], [], []

    # Aggregate stats
    total_deals = len(deals)
    total_won = sum(1 for d in deals if d["status"] in ("confirmed", "fulfilled"))
    total_lost = sum(1 for d in deals if d["status"] == "cancelled")
    total_revenue = sum(d["total_amount"] for d in deals if d["status"] in ("confirmed", "fulfilled"))
    total_pipeline = sum(d["total_amount"] for d in deals if d["status"] not in ("cancelled", "fulfilled"))
    total_paid = sum(i["amount"] for i in invoices if i["status"] == "paid")
    total_outstanding = sum(i["amount"] for i in invoices if i["status"] != "paid" and i["amount"] > 0)
    avg_margin = round(sum(d["margin_percent"] for d in deals) / max(len(deals), 1), 2)
    win_rate = round((total_won / max(total_deals, 1)) * 100, 1)

    return {
        "customer": {
            "id": str(customer.id),
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "tier": customer.tier.value if hasattr(customer.tier, "value") else str(customer.tier),
            "industry": customer.industry,
            "address": customer.address,
            "lifetime_value": customer.lifetime_value,
            "created_at": customer.created_at.isoformat() if customer.created_at else None,
        },
        "stats": {
            "total_deals": total_deals,
            "won_deals": total_won,
            "lost_deals": total_lost,
            "win_rate_percent": win_rate,
            "total_revenue": round(total_revenue, 2),
            "total_pipeline": round(total_pipeline, 2),
            "total_paid": round(total_paid, 2),
            "total_outstanding": round(total_outstanding, 2),
            "avg_margin_percent": avg_margin,
            "total_negotiations": len(negotiations),
            "total_invoices": len(invoices),
        },
        "deals": deals,
        "quotes": quotes,
        "negotiations": negotiations,
        "invoices": invoices,
    }
