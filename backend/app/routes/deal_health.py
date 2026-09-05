from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.deal import Deal, DealStatus
from app.models.customer import Customer
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/")
async def deal_health(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(
        select(Deal).where(Deal.status.notin_([DealStatus.FULFILLED, DealStatus.CANCELLED]))
        .order_by(Deal.risk_score.desc()).limit(50)
    )
    deals = result.scalars().all()

    items = []
    for d in deals:
        cust = (await db.execute(select(Customer).where(Customer.id == d.customer_id))).scalar_one_or_none()
        risk_level = "low" if d.risk_score < 40 else ("medium" if d.risk_score < 70 else "high")
        items.append({
            "id": str(d.id), "deal_number": d.deal_number,
            "customer_name": cust.name if cust else "Unknown",
            "total_amount": d.total_amount, "margin_percent": d.margin_percent,
            "risk_score": d.risk_score, "risk_level": risk_level,
            "status": d.status.value,
            "last_activity_at": d.last_activity_at.isoformat() if d.last_activity_at else None,
        })

    high = sum(1 for i in items if i["risk_level"] == "high")
    medium = sum(1 for i in items if i["risk_level"] == "medium")
    low = sum(1 for i in items if i["risk_level"] == "low")

    return {"summary": {"high": high, "medium": medium, "low": low, "total": len(items)}, "items": items}