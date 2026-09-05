from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.models.customer import Customer, CustomerTier
from app.auth.dependencies import get_current_user
from app.models.user import User

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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    await db.delete(customer)
    await db.commit()
    return {"status": "success", "message": f"Customer {customer_id} deleted"}