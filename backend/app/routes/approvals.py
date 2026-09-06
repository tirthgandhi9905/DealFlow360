from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel
from app.database import get_db
from app.models.approval import Approval, ApprovalStep, ApprovalStatus
from app.models.deal import Deal, DealStatus
from app.models.customer import Customer
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user

router = APIRouter()


class ApprovalActionRequest(BaseModel):
    action: ApprovalStatus  # APPROVED, REJECTED, RETURNED
    note: Optional[str] = None


@router.get("/")
async def list_approvals(
    status: Optional[ApprovalStatus] = Query(None, description="Filter by approval status"),
    required_level: Optional[str] = Query(None, description="Filter by required level"),
    search: Optional[str] = Query(None, description="Search by deal number, customer name, or sales rep"),
    min_amount: Optional[float] = Query(None, description="Minimum deal amount"),
    max_amount: Optional[float] = Query(None, description="Maximum deal amount"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(
            Approval,
            Deal.deal_number,
            Deal.total_amount,
            Deal.margin_percent,
            Deal.risk_score,
            Customer.name.label("customer_name"),
            Customer.tier.label("customer_tier"),
            User.name.label("sales_rep_name"),
        )
        .join(Deal, Approval.deal_id == Deal.id)
        .join(Customer, Deal.customer_id == Customer.id)
        .join(User, Deal.sales_rep_id == User.id)
    )

    if status:
        query = query.where(Approval.status == status)
    if required_level:
        query = query.where(Approval.required_level == required_level)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                Deal.deal_number.ilike(search_pattern),
                Customer.name.ilike(search_pattern),
                User.name.ilike(search_pattern),
            )
        )
    if min_amount is not None:
        query = query.where(Deal.total_amount >= min_amount)
    if max_amount is not None:
        query = query.where(Deal.total_amount <= max_amount)

    total_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit).order_by(Approval.created_at.desc())
    result = await db.execute(query)
    rows = result.all()

    items = []
    for appr, deal_no, amount, margin, risk, cust_name, cust_tier, rep_name in rows:
        items.append({
            "id": str(appr.id),
            "deal_id": str(appr.deal_id),
            "deal_number": deal_no,
            "customer_name": cust_name,
            "customer_tier": cust_tier.value if hasattr(cust_tier, "value") else str(cust_tier),
            "sales_rep_name": rep_name,
            "deal_amount": amount,
            "deal_margin": margin,
            "risk_score": risk,
            "status": appr.status.value if hasattr(appr.status, "value") else str(appr.status),
            "required_level": appr.required_level,
            "created_at": appr.created_at.isoformat() if appr.created_at else None,
            "resolved_at": appr.resolved_at.isoformat() if appr.resolved_at else None,
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items,
    }


@router.get("/{approval_id}")
async def get_approval(
    approval_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(
            Approval,
            Deal.deal_number,
            Deal.total_amount,
            Deal.margin_percent,
            Deal.risk_score,
            Deal.status.label("deal_status"),
            Customer.name.label("customer_name"),
            Customer.tier.label("customer_tier"),
            User.name.label("sales_rep_name"),
        )
        .join(Deal, Approval.deal_id == Deal.id)
        .join(Customer, Deal.customer_id == Customer.id)
        .join(User, Deal.sales_rep_id == User.id)
        .where(Approval.id == approval_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Approval not found")

    appr, deal_no, amount, margin, risk, deal_status, cust_name, cust_tier, rep_name = row

    steps_res = await db.execute(
        select(ApprovalStep, User.name.label("approver_name"))
        .join(User, ApprovalStep.approver_id == User.id)
        .where(ApprovalStep.approval_id == appr.id)
        .order_by(ApprovalStep.created_at.asc())
    )
    steps = steps_res.all()

    return {
        "id": str(appr.id),
        "deal_id": str(appr.deal_id),
        "deal_number": deal_no,
        "customer_name": cust_name,
        "customer_tier": cust_tier.value if hasattr(cust_tier, "value") else str(cust_tier),
        "sales_rep_name": rep_name,
        "deal_amount": amount,
        "deal_margin": margin,
        "deal_status": deal_status.value if hasattr(deal_status, "value") else str(deal_status),
        "risk_score": risk,
        "status": appr.status.value if hasattr(appr.status, "value") else str(appr.status),
        "required_level": appr.required_level,
        "created_at": appr.created_at.isoformat() if appr.created_at else None,
        "resolved_at": appr.resolved_at.isoformat() if appr.resolved_at else None,
        "steps": [
            {
                "id": str(s.id),
                "approver_name": u_name,
                "action": s.action.value if hasattr(s.action, "value") else str(s.action),
                "note": s.note,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s, u_name in steps
        ],
    }


@router.post("/{approval_id}/action")
async def take_approval_action(
    approval_id: UUID,
    payload: ApprovalActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.SALES_REP:
        raise HTTPException(status_code=403, detail="Sales Representatives lack approval authority")

    appr_res = await db.execute(select(Approval).where(Approval.id == approval_id))
    approval = appr_res.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if approval.status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Approval has already been resolved")

    # Determine if it's an endorsement vs full approval
    is_endorsement = False
    note = payload.note

    if payload.action == ApprovalStatus.APPROVED:
        if approval.required_level == "finance":
            if current_user.role == UserRole.SALES_MANAGER:
                is_endorsement = True
                note = "Manager endorsed. Pending Finance Director sign-off"
            elif current_user.role not in [UserRole.FINANCE, UserRole.ADMIN]:
                raise HTTPException(status_code=403, detail="Finance role required for this approval")
        elif approval.required_level == "manager":
            if current_user.role not in [UserRole.SALES_MANAGER, UserRole.FINANCE, UserRole.ADMIN]:
                raise HTTPException(status_code=403, detail="Manager role required for this approval")

    step = ApprovalStep(
        approval_id=approval.id,
        approver_id=current_user.id,
        action=payload.action if not is_endorsement else ApprovalStatus.PENDING,
        note=note,
    )
    db.add(step)

    deal_res = await db.execute(select(Deal).where(Deal.id == approval.deal_id))
    deal = deal_res.scalar_one_or_none()

    if not is_endorsement:
        approval.status = payload.action
        approval.resolved_at = datetime.utcnow()

        if deal:
            if payload.action == ApprovalStatus.APPROVED:
                deal.status = DealStatus.APPROVED
            elif payload.action == ApprovalStatus.REJECTED:
                deal.status = DealStatus.CANCELLED

    await db.commit()
    await db.refresh(approval)

    return {
        "status": "success",
        "approval_status": approval.status.value if hasattr(approval.status, "value") else str(approval.status),
        "resolved_at": approval.resolved_at.isoformat() if approval.resolved_at else None,
    }