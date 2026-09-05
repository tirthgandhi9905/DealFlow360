from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from pydantic import BaseModel
from app.database import get_db
from app.models.product import Product, ProductCategory, PriceList
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


class ProductCreate(BaseModel):
    name: str
    sku: str
    category: ProductCategory
    description: Optional[str] = None
    base_price: float
    cost: float
    tax_percent: float = 0.0
    is_subscription: bool = False
    recurring_interval: Optional[str] = None
    is_active: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[ProductCategory] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    cost: Optional[float] = None
    tax_percent: Optional[float] = None
    is_subscription: bool = False
    recurring_interval: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_products(
    category: Optional[ProductCategory] = Query(None, description="Filter by product category"),
    search: Optional[str] = Query(None, description="Search by name or SKU"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Product)
    if category:
        query = query.where(Product.category == category)
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(Product.name.ilike(pattern), Product.sku.ilike(pattern)))

    total_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit).order_by(Product.name.asc())
    result = await db.execute(query)
    products = result.scalars().all()

    items = []
    for p in products:
        margin_amt = p.base_price - p.cost
        margin_pct = round((margin_amt / p.base_price) * 100, 2) if p.base_price > 0 else 0.0
        items.append({
            "id": str(p.id),
            "name": p.name,
            "sku": p.sku,
            "category": p.category.value if hasattr(p.category, "value") else str(p.category),
            "description": p.description,
            "base_price": p.base_price,
            "cost": p.cost,
            "margin_amount": round(margin_amt, 2),
            "margin_percent": margin_pct,
            "tax_percent": p.tax_percent,
            "is_subscription": p.is_subscription,
            "recurring_interval": p.recurring_interval,
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items,
    }


@router.get("/price-lists")
async def get_price_lists(
    tier: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(PriceList)
    if tier:
        query = query.where(PriceList.tier == tier.lower())
    if category:
        query = query.where(PriceList.category == category.lower())
    
    result = await db.execute(query)
    lists = result.scalars().all()
    return {
        "items": [
            {
                "id": str(pl.id),
                "tier": pl.tier,
                "category": pl.category,
                "max_discount_percent": pl.max_discount_percent,
                "created_at": pl.created_at.isoformat() if pl.created_at else None,
            }
            for pl in lists
        ]
    }


@router.get("/{product_id}")
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    margin_amt = p.base_price - p.cost
    margin_pct = round((margin_amt / p.base_price) * 100, 2) if p.base_price > 0 else 0.0

    return {
        "id": str(p.id),
        "name": p.name,
        "sku": p.sku,
        "category": p.category.value if hasattr(p.category, "value") else str(p.category),
        "description": p.description,
        "base_price": p.base_price,
        "cost": p.cost,
        "margin_amount": round(margin_amt, 2),
        "margin_percent": margin_pct,
        "tax_percent": p.tax_percent,
        "is_subscription": p.is_subscription,
        "recurring_interval": p.recurring_interval,
        "is_active": p.is_active,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.post("/")
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(Product).where(Product.sku == data.sku))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Product with this SKU already exists")

    product = Product(
        name=data.name,
        sku=data.sku,
        category=data.category,
        description=data.description,
        base_price=data.base_price,
        cost=data.cost,
        tax_percent=data.tax_percent,
        is_subscription=data.is_subscription,
        recurring_interval=data.recurring_interval,
        is_active=data.is_active,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)

    return {
        "id": str(product.id),
        "name": product.name,
        "sku": product.sku,
        "category": product.category.value if hasattr(product.category, "value") else str(product.category),
        "base_price": product.base_price,
        "cost": product.cost,
        "created_at": product.created_at.isoformat() if product.created_at else None,
    }