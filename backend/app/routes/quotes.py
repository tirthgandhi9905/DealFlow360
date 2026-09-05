from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel
from app.database import get_db
from app.models.quote import Quote, QuoteLine
from app.models.deal import Deal, DealStatus
from app.models.customer import Customer
from app.models.product import Product
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


class QuoteLineInput(BaseModel):
    product_id: UUID
    quantity: int = 1
    unit_price: float
    discount_percent: float = 0.0
    discount_limit: float = 0.0


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

    return {
        "id": str(quote.id),
        "quote_number": quote.quote_number,
        "deal_id": str(quote.deal_id),
        "deal_number": deal.deal_number if deal else None,
        "deal_status": deal.status.value if deal and hasattr(deal.status, "value") else str(deal.status) if deal else None,
        "customer_name": customer_name,
        "customer_tier": customer_tier.value if customer_tier and hasattr(customer_tier, "value") else str(customer_tier) if customer_tier else None,
        "version": quote.version,
        "subtotal": quote.subtotal,
        "total_discount": quote.total_discount,
        "tax_amount": quote.tax_amount,
        "grand_total": quote.grand_total,
        "created_at": quote.created_at.isoformat() if quote.created_at else None,
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