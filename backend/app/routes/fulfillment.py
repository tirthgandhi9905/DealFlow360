from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.fulfillment import Fulfillment
from app.models.deal import Deal
from app.models.customer import Customer
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/")
async def list_fulfillments(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    query = select(Fulfillment).order_by(Fulfillment.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items_raw = result.scalars().all()

    items = []
    for f in items_raw:
        deal = (await db.execute(select(Deal).where(Deal.id == f.deal_id))).scalar_one_or_none()
        cust_name = "Unknown"
        if deal:
            cust = (await db.execute(select(Customer).where(Customer.id == deal.customer_id))).scalar_one_or_none()
            cust_name = cust.name if cust else "Unknown"
        items.append({
            "id": str(f.id), "deal_number": deal.deal_number if deal else None,
            "customer_name": cust_name,
            "status": f.status, "total_shipping_cost": f.total_shipping_cost,
            "delivery_confidence": f.delivery_confidence,
            "estimated_delivery": f.estimated_delivery.isoformat() if f.estimated_delivery else None,
        })

    total = (await db.execute(select(func.count(Fulfillment.id)))).scalar()
    return {"total": total, "items": items}