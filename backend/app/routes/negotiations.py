from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.negotiation import Negotiation, NegotiationRound
from app.models.deal import Deal
from app.models.customer import Customer
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/")
async def list_negotiations(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    query = select(Negotiation).order_by(Negotiation.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    negs = result.scalars().all()

    items = []
    for n in negs:
        deal = (await db.execute(select(Deal).where(Deal.id == n.deal_id))).scalar_one_or_none()
        cust_name = "Unknown"
        if deal:
            cust = (await db.execute(select(Customer).where(Customer.id == deal.customer_id))).scalar_one_or_none()
            cust_name = cust.name if cust else "Unknown"
        items.append({
            "id": str(n.id), "deal_number": deal.deal_number if deal else None,
            "customer_name": cust_name,
            "round_count": n.round_count, "status": n.status,
            "deal_amount": deal.total_amount if deal else 0,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })

    total = (await db.execute(select(func.count(Negotiation.id)))).scalar()
    return {"total": total, "items": items}