from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.database import get_db
from app.models.deal import Deal, DealStatus
from app.models.customer import Customer, CustomerTier
from app.models.invoice import Invoice
from app.models.approval import Approval, ApprovalStatus
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/")
@router.get("/metrics")
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Total revenue and cost across confirmed/fulfilled deals
    rev_res = await db.execute(
        select(
            func.sum(Deal.total_amount).label("total_revenue"),
            func.sum(Deal.total_cost).label("total_cost"),
            func.avg(Deal.margin_percent).label("avg_margin"),
            func.count(Deal.id).label("total_deals"),
        )
    )
    rev_row = rev_res.first()
    total_rev = rev_row.total_revenue or 0.0
    total_cost = rev_row.total_cost or 0.0
    avg_margin = rev_row.avg_margin or 0.0
    total_deals = rev_row.total_deals or 0

    # Deals by status breakdown
    status_res = await db.execute(
        select(Deal.status, func.count(Deal.id), func.sum(Deal.total_amount))
        .group_by(Deal.status)
    )
    status_breakdown = {}
    for st, count, vol in status_res.all():
        key = st.value if hasattr(st, "value") else str(st)
        status_breakdown[key] = {
            "count": count,
            "volume": round(vol or 0.0, 2),
        }

    # Risk breakdown (low: <=30, medium: 31-70, high: >70)
    risk_res = await db.execute(
        select(
            func.count(case((Deal.risk_score <= 30, 1))).label("low_risk"),
            func.count(case(((Deal.risk_score > 30) & (Deal.risk_score <= 70), 1))).label("med_risk"),
            func.count(case((Deal.risk_score > 70, 1))).label("high_risk"),
        )
    )
    risk_row = risk_res.first()

    # Invoices and collections summary
    inv_res = await db.execute(
        select(
            func.sum(case((Invoice.status == "paid", Invoice.amount), else_=0)).label("collected"),
            func.sum(case((Invoice.status != "paid", Invoice.amount), else_=0)).label("outstanding"),
            func.count(Invoice.id).label("invoice_count"),
        )
    )
    inv_row = inv_res.first()
    collected = inv_row.collected or 0.0
    outstanding = inv_row.outstanding or 0.0

    # Pending approvals count
    appr_res = await db.execute(
        select(func.count(Approval.id)).where(Approval.status == ApprovalStatus.PENDING)
    )
    pending_approvals = appr_res.scalar() or 0

    # Tier breakdown
    tier_res = await db.execute(
        select(Customer.tier, func.count(Customer.id), func.sum(Customer.lifetime_value))
        .group_by(Customer.tier)
    )
    tier_breakdown = {}
    for tier, count, ltv_sum in tier_res.all():
        t_key = tier.value if hasattr(tier, "value") else str(tier)
        tier_breakdown[t_key] = {
            "customer_count": count,
            "total_ltv": round(ltv_sum or 0.0, 2),
        }

    return {
        "financials": {
            "total_revenue": round(total_rev, 2),
            "total_cost": round(total_cost, 2),
            "gross_profit": round(total_rev - total_cost, 2),
            "avg_margin_percent": round(avg_margin, 2),
            "total_collected": round(collected, 2),
            "total_outstanding": round(outstanding, 2),
        },
        "deals_summary": {
            "total_deals": total_deals,
            "by_status": status_breakdown,
        },
        "risk_breakdown": {
            "low_risk": risk_row.low_risk or 0,
            "medium_risk": risk_row.med_risk or 0,
            "high_risk": risk_row.high_risk or 0,
        },
        "pending_approvals_count": pending_approvals,
        "customers_by_tier": tier_breakdown,
    }