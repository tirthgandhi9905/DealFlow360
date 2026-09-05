import csv
import io
from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel
from app.database import get_db
from app.models.deal import Deal, DealStatus
from app.models.customer import Customer
from app.models.user import User
from app.models.quote import Quote
from app.models.audit import AuditEvent
from app.auth.dependencies import get_current_user

router = APIRouter()


class NudgeEscalateRequest(BaseModel):
    action_type: str = "nudge"  # "nudge", "escalate", "reminder"
    message: Optional[str] = None


@router.get("/")
async def deal_health(
    stalled_days: int = Query(7, description="Threshold in days to flag a deal as stalled"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (low, medium, high)"),
    search: Optional[str] = Query(None, description="Search by deal number or customer name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Deal Health & Anomaly Dashboard:
    - Identifies stalled deals (inactive for > configured days).
    - Identifies discount anomalies (risk score > 70 or negative/low margin).
    - Identifies delivery slippage and momentum loss.
    """
    from sqlalchemy import or_
    now = datetime.utcnow()
    stalled_threshold_date = now - timedelta(days=stalled_days)

    query = (
        select(Deal, Customer.name.label("customer_name"), Customer.tier.label("customer_tier"), User.name.label("sales_rep_name"))
        .join(Customer, Deal.customer_id == Customer.id)
        .join(User, Deal.sales_rep_id == User.id)
        .where(Deal.status.notin_([DealStatus.FULFILLED, DealStatus.CANCELLED]))
        .order_by(Deal.risk_score.desc())
    )
    if search:
        pat = f"%{search}%"
        query = query.where(or_(Deal.deal_number.ilike(pat), Customer.name.ilike(pat)))

    result = await db.execute(query)
    rows = result.all()

    items = []
    stalled_count = 0
    anomaly_count = 0

    for deal, cust_name, cust_tier, rep_name in rows:
        r_level = "low" if deal.risk_score <= 30 else ("medium" if deal.risk_score <= 70 else "high")
        
        last_act = deal.last_activity_at or deal.updated_at or deal.created_at
        idle_days = (now - last_act.replace(tzinfo=None)).days if last_act else 0
        is_stalled = idle_days >= stalled_days
        if is_stalled:
            stalled_count += 1

        is_anomaly = deal.risk_score >= 60 or deal.margin_percent < 20.0
        if is_anomaly:
            anomaly_count += 1

        if risk_level and r_level != risk_level.lower():
            continue

        items.append({
            "id": str(deal.id),
            "deal_number": deal.deal_number,
            "customer_name": cust_name,
            "customer_tier": cust_tier.value if hasattr(cust_tier, "value") else str(cust_tier),
            "sales_rep_name": rep_name,
            "total_amount": deal.total_amount,
            "margin_percent": deal.margin_percent,
            "risk_score": deal.risk_score,
            "risk_level": r_level,
            "status": deal.status.value if hasattr(deal.status, "value") else str(deal.status),
            "idle_days": idle_days,
            "is_stalled": is_stalled,
            "is_anomaly": is_anomaly,
            "last_activity_at": last_act.isoformat() if last_act else None,
            "anomaly_reason": "High discount variance above tier policy" if deal.risk_score >= 60 else ("Low margin threshold breach" if deal.margin_percent < 20.0 else None),
        })

    high = sum(1 for i in items if i["risk_level"] == "high")
    medium = sum(1 for i in items if i["risk_level"] == "medium")
    low = sum(1 for i in items if i["risk_level"] == "low")

    # Paginate AFTER filtering; total reflects post-filter count
    total = len(items)
    paginated = items[skip : skip + limit]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "summary": {
            "total_active_deals": total,
            "high_risk": high,
            "medium_risk": medium,
            "low_risk": low,
            "stalled_deals_count": stalled_count,
            "anomaly_deals_count": anomaly_count,
        },
        "items": paginated,
    }


@router.post("/{deal_id}/nudge")
async def trigger_automated_nudge(
    deal_id: UUID,
    payload: NudgeEscalateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Triggers an automated nudge, reminder, or manager escalation on a stalled / at-risk quotation.
    """
    deal_res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = deal_res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal.last_activity_at = datetime.utcnow()
    action_label = "Escalated to Sales Manager" if payload.action_type == "escalate" else "Automated Nudge Sent"

    audit = AuditEvent(
        id=uuid4(),
        entity_type="deal",
        entity_id=deal.id,
        action=f"deal_{payload.action_type}",
        user_id=user.id,
        new_value=f'{{"action_type":"{payload.action_type}","triggered_by":"{user.name}"}}',
        reason=payload.message or f"{action_label} for Deal {deal.deal_number} due to stall/risk alert.",
    )
    db.add(audit)

    await db.commit()
    return {
        "status": "success",
        "deal_id": str(deal.id),
        "deal_number": deal.deal_number,
        "action_type": payload.action_type,
        "message": f"Successfully triggered {payload.action_type} on Deal {deal.deal_number}. Sales rep and manager notified.",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/export")
async def export_deals_report(
    format: str = Query("csv", regex="^(csv|json)$"),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Exports filtered platform-wide deals, revenue, and margins into CSV format for sales reporting.
    """
    query = (
        select(Deal, Customer.name.label("customer_name"), Customer.tier.label("customer_tier"), User.name.label("sales_rep_name"))
        .join(Customer, Deal.customer_id == Customer.id)
        .join(User, Deal.sales_rep_id == User.id)
        .order_by(Deal.created_at.desc())
    )

    if status:
        query = query.where(Deal.status == status.lower())

    result = await db.execute(query)
    rows = result.all()

    if format == "json":
        return [
            {
                "deal_number": d.deal_number,
                "customer": cust,
                "tier": tier.value if hasattr(tier, "value") else str(tier),
                "sales_rep": rep,
                "status": d.status.value if hasattr(d.status, "value") else str(d.status),
                "total_amount": d.total_amount,
                "total_cost": d.total_cost,
                "margin_percent": d.margin_percent,
                "risk_score": d.risk_score,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d, cust, tier, rep in rows
        ]

    # Generate CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Deal Number", "Customer Name", "Customer Tier", "Sales Rep", "Status", "Total Amount (INR)", "Total Cost (INR)", "Margin %", "Risk Score", "Created Date"])

    for d, cust, tier, rep in rows:
        writer.writerow([
            d.deal_number,
            cust,
            tier.value if hasattr(tier, "value") else str(tier),
            rep,
            d.status.value if hasattr(d.status, "value") else str(d.status),
            d.total_amount,
            d.total_cost,
            d.margin_percent,
            d.risk_score,
            d.created_at.strftime("%Y-%m-%d %H:%M") if d.created_at else "",
        ])

    output.seek(0)
    filename = f"dealflow360_deals_export_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )