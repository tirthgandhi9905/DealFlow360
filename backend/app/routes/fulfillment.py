from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.fulfillment import Fulfillment, FulfillmentLine
from app.models.warehouse import Warehouse, Inventory
from app.models.deal import Deal, DealStatus
from app.models.customer import Customer
from app.models.product import Product, ProductCategory
from app.models.quote import Quote, QuoteLine
from app.models.audit import AuditEvent
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.fulfillment_optimizer import optimize_fulfillment

router = APIRouter()


class OptimizeFulfillmentRequest(BaseModel):
    deal_id: Optional[UUID] = None
    items: Optional[List[Dict[str, Any]]] = None  # [{product_id: UUID or str, quantity: int}]
    alpha: float = 0.4  # shipping cost weight
    beta: float = 0.4   # delivery delay weight
    gamma: float = 0.2  # split penalty weight
    auto_create: bool = False  # if True and deal_id provided, persist Fulfillment records


class SplitAllocationItem(BaseModel):
    warehouse_id: UUID
    product_id: UUID
    quantity: int


class ManualOverrideRequest(BaseModel):
    allocations: List[SplitAllocationItem]
    notes: Optional[str] = None


class ConsolidateBackorderRequest(BaseModel):
    preferred_warehouse_id: Optional[UUID] = None


@router.get("/")
async def list_fulfillments(
    deal_id: Optional[UUID] = Query(None, description="Filter by deal"),
    status: Optional[str] = Query(None, description="Filter by fulfillment status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    query = (
        select(Fulfillment, Deal.deal_number, Customer.name.label("customer_name"), Customer.address.label("delivery_address"))
        .join(Deal, Fulfillment.deal_id == Deal.id)
        .join(Customer, Deal.customer_id == Customer.id)
    )

    if deal_id:
        query = query.where(Fulfillment.deal_id == deal_id)
    if status:
        query = query.where(Fulfillment.status == status.lower())

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0

    query = query.order_by(Fulfillment.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    items = []
    for f, deal_no, cust_name, address in rows:
        # Fetch lines
        lines_res = await db.execute(
            select(FulfillmentLine, Warehouse.name.label("warehouse_name"), Product.name.label("product_name"), Product.sku.label("product_sku"))
            .join(Warehouse, FulfillmentLine.warehouse_id == Warehouse.id)
            .join(Product, FulfillmentLine.product_id == Product.id)
            .where(FulfillmentLine.fulfillment_id == f.id)
        )
        lines = lines_res.all()

        items.append({
            "id": str(f.id),
            "deal_id": str(f.deal_id),
            "deal_number": deal_no,
            "customer_name": cust_name,
            "delivery_address": address,
            "status": f.status,
            "total_shipping_cost": f.total_shipping_cost,
            "delivery_confidence": f.delivery_confidence,
            "estimated_delivery": f.estimated_delivery.isoformat() if f.estimated_delivery else None,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "lines": [
                {
                    "id": str(line.id),
                    "warehouse_id": str(line.warehouse_id),
                    "warehouse_name": wh_name,
                    "product_id": str(line.product_id),
                    "product_name": p_name,
                    "product_sku": p_sku,
                    "quantity": line.quantity,
                    "shipping_cost": line.shipping_cost,
                }
                for line, wh_name, p_name, p_sku in lines
            ],
        })

    return {"total": total, "items": items}


@router.post("/optimize")
async def run_fulfillment_optimization(
    payload: OptimizeFulfillmentRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Connects OR-Tools MILP optimizer with live inventory across all warehouses.
    Optimizes split distribution to minimize total shipping cost, delivery days, and warehouse splits.
    """
    order_items = []

    # If deal_id provided, fetch physical/hardware items from latest quote
    if payload.deal_id:
        quote_res = await db.execute(
            select(Quote).where(Quote.deal_id == payload.deal_id).order_by(Quote.version.desc())
        )
        quote = quote_res.scalars().first()
        if not quote:
            raise HTTPException(status_code=404, detail="No quotation found for this deal")

        # Get hardware products lines
        lines_res = await db.execute(
            select(QuoteLine, Product.category, Product.name)
            .join(Product, QuoteLine.product_id == Product.id)
            .where(QuoteLine.quote_id == quote.id)
        )
        lines = lines_res.all()
        for ql, cat, p_name in lines:
            if cat == ProductCategory.HARDWARE:
                order_items.append({"product_id": str(ql.product_id), "quantity": ql.quantity, "name": p_name})
    elif payload.items:
        for item in payload.items:
            order_items.append({"product_id": str(item["product_id"]), "quantity": int(item["quantity"])})
    else:
        raise HTTPException(status_code=400, detail="Must provide either deal_id or items list")

    if not order_items:
        return {
            "status": "not_applicable",
            "message": "No physical/hardware items requiring warehouse fulfillment",
            "allocation": [],
        }

    # Fetch live warehouses and inventory
    wh_res = await db.execute(select(Warehouse))
    warehouses_db = wh_res.scalars().all()

    inv_res = await db.execute(select(Inventory))
    inventory_db = inv_res.scalars().all()

    # Build warehouse stock map
    stock_by_wh = {}
    for inv in inventory_db:
        wid = str(inv.warehouse_id)
        pid = str(inv.product_id)
        if wid not in stock_by_wh:
            stock_by_wh[wid] = {}
        stock_by_wh[wid][pid] = inv.quantity_available - inv.quantity_reserved

    warehouses_input = []
    for wh in warehouses_db:
        wid = str(wh.id)
        warehouses_input.append({
            "id": wid,
            "name": wh.name,
            "shipping_cost": wh.shipping_cost_per_unit,
            "delivery_days": wh.avg_delivery_days,
            "stock": stock_by_wh.get(wid, {}),
        })

    # Run MILP solver
    solution = optimize_fulfillment(
        order_items=order_items,
        warehouses=warehouses_input,
        alpha=payload.alpha,
        beta=payload.beta,
        gamma=payload.gamma,
    )

    if "error" in solution:
        # Check partial stock / backorder needed
        return {
            "status": "backorder_required",
            "message": "Insufficient warehouse stock to fulfill complete order. Partial allocation or backorder needed.",
            "details": solution,
            "order_items": order_items,
        }

    # If auto_create is true and deal_id exists, persist to database
    created_fulfillment_id = None
    if payload.auto_create and payload.deal_id:
        delivery_days = solution.get("max_delivery_days", 3)
        est_delivery = datetime.utcnow() + timedelta(days=delivery_days)
        
        fulfillment = Fulfillment(
            id=uuid4(),
            deal_id=payload.deal_id,
            status="in_transit",
            total_shipping_cost=solution.get("total_cost", 0.0),
            estimated_delivery=est_delivery,
            delivery_confidence=0.95 if solution.get("splits", 1) == 1 else 0.88,
        )
        db.add(fulfillment)

        for alloc in solution.get("allocation", []):
            wh_id = UUID(alloc["warehouse_id"])
            for it in alloc.get("items", []):
                fl = FulfillmentLine(
                    id=uuid4(),
                    fulfillment_id=fulfillment.id,
                    warehouse_id=wh_id,
                    product_id=UUID(it["product_id"]),
                    quantity=it["quantity"],
                    shipping_cost=it["cost"],
                )
                db.add(fl)

        # Audit event
        audit = AuditEvent(
            id=uuid4(),
            entity_type="deal",
            entity_id=payload.deal_id,
            action="fulfillment_created",
            user_id=user.id,
            new_value=f'{{"splits":{solution.get("splits")},"total_cost":{solution.get("total_cost")}}}',
            reason="Auto-split fulfillment plan generated and confirmed by OR-Tools optimizer",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(fulfillment)
        created_fulfillment_id = str(fulfillment.id)

    return {
        "status": "optimal",
        "optimization_result": solution,
        "created_fulfillment_id": created_fulfillment_id,
    }


@router.post("/{fulfillment_id}/split-override")
async def manual_split_override(
    fulfillment_id: UUID,
    payload: ManualOverrideRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Allows sales managers / operations users to manually override the warehouse split allocation.
    """
    f_res = await db.execute(select(Fulfillment).where(Fulfillment.id == fulfillment_id))
    fulfillment = f_res.scalar_one_or_none()
    if not fulfillment:
        raise HTTPException(status_code=404, detail="Fulfillment record not found")

    # Fetch warehouse pricing
    wh_res = await db.execute(select(Warehouse))
    warehouses_dict = {w.id: w for w in wh_res.scalars().all()}

    # Delete existing lines
    await db.execute(
        FulfillmentLine.__table__.delete().where(FulfillmentLine.fulfillment_id == fulfillment.id)
    )

    total_shipping = 0.0
    max_days = 0
    new_lines = []

    for alloc in payload.allocations:
        wh = warehouses_dict.get(alloc.warehouse_id)
        if not wh:
            raise HTTPException(status_code=400, detail=f"Warehouse {alloc.warehouse_id} not found")
        
        line_cost = round(alloc.quantity * wh.shipping_cost_per_unit, 2)
        total_shipping += line_cost
        if wh.avg_delivery_days > max_days:
            max_days = wh.avg_delivery_days

        fl = FulfillmentLine(
            id=uuid4(),
            fulfillment_id=fulfillment.id,
            warehouse_id=alloc.warehouse_id,
            product_id=alloc.product_id,
            quantity=alloc.quantity,
            shipping_cost=line_cost,
        )
        db.add(fl)
        new_lines.append(fl)

    fulfillment.total_shipping_cost = total_shipping
    fulfillment.estimated_delivery = datetime.utcnow() + timedelta(days=max_days)
    fulfillment.status = "overridden"

    # Audit event
    audit = AuditEvent(
        id=uuid4(),
        entity_type="fulfillment",
        entity_id=fulfillment.id,
        action="manual_override",
        user_id=user.id,
        new_value=f'{{"lines_count":{len(payload.allocations)},"total_cost":{total_shipping}}}',
        reason=payload.notes or "Manual warehouse split override applied by operations",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(fulfillment)

    return {
        "status": "success",
        "fulfillment_id": str(fulfillment.id),
        "total_shipping_cost": fulfillment.total_shipping_cost,
        "estimated_delivery": fulfillment.estimated_delivery.isoformat() if fulfillment.estimated_delivery else None,
        "lines_count": len(new_lines),
    }


@router.post("/{fulfillment_id}/consolidate-backorder")
async def consolidate_backorder(
    fulfillment_id: UUID,
    payload: ConsolidateBackorderRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Consolidates pending backorders / split shipments once replenished stock arrives at a central warehouse.
    """
    f_res = await db.execute(select(Fulfillment).where(Fulfillment.id == fulfillment_id))
    fulfillment = f_res.scalar_one_or_none()
    if not fulfillment:
        raise HTTPException(status_code=404, detail="Fulfillment not found")

    lines_res = await db.execute(
        select(FulfillmentLine).where(FulfillmentLine.fulfillment_id == fulfillment.id)
    )
    lines = lines_res.scalars().all()

    # Pick preferred warehouse or lowest cost warehouse
    wh_res = await db.execute(select(Warehouse).order_by(Warehouse.shipping_cost_per_unit.asc()))
    warehouses = wh_res.scalars().all()
    target_wh = next((w for w in warehouses if w.id == payload.preferred_warehouse_id), warehouses[0])

    # Re-assign all lines to the consolidated target warehouse
    total_shipping = 0.0
    for line in lines:
        line.warehouse_id = target_wh.id
        line.shipping_cost = round(line.quantity * target_wh.shipping_cost_per_unit, 2)
        total_shipping += line.shipping_cost

    fulfillment.total_shipping_cost = total_shipping
    fulfillment.delivery_confidence = 0.98
    fulfillment.status = "consolidated"
    fulfillment.estimated_delivery = datetime.utcnow() + timedelta(days=target_wh.avg_delivery_days)

    audit = AuditEvent(
        id=uuid4(),
        entity_type="fulfillment",
        entity_id=fulfillment.id,
        action="consolidate_backorder",
        user_id=user.id,
        new_value=f'{{"consolidated_warehouse":"{target_wh.name}","total_shipping":{total_shipping}}}',
        reason=f"Backorder stock consolidated to single shipment from {target_wh.name}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(fulfillment)

    return {
        "status": "success",
        "message": f"Fulfillment successfully consolidated to {target_wh.name}",
        "warehouse_id": str(target_wh.id),
        "warehouse_name": target_wh.name,
        "total_shipping_cost": total_shipping,
        "estimated_delivery": fulfillment.estimated_delivery.isoformat() if fulfillment.estimated_delivery else None,
    }