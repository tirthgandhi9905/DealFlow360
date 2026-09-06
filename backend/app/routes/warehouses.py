from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.database import get_db
from app.models.warehouse import Warehouse
from app.auth.dependencies import get_current_user, require_role
from app.models.user import User, UserRole

router = APIRouter()

class WarehouseCreate(BaseModel):
    name: str
    location: str
    capacity: Optional[int] = 5000
    shipping_cost_per_unit: Optional[float] = 150.0
    avg_delivery_days: Optional[int] = 3

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    capacity: Optional[int] = None
    shipping_cost_per_unit: Optional[float] = None
    avg_delivery_days: Optional[int] = None

@router.get("/")
async def list_warehouses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Warehouse).order_by(Warehouse.name.asc()))
    warehouses = result.scalars().all()
    return {
        "items": [
            {
                "id": str(w.id),
                "name": w.name,
                "location": w.location,
                "capacity": getattr(w, "capacity", 5000) or 5000,
                "shipping_cost_per_unit": w.shipping_cost_per_unit,
                "avg_delivery_days": w.avg_delivery_days,
            }
            for w in warehouses
        ]
    }

@router.post("/")
async def create_warehouse(
    data: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES_MANAGER)),
):
    w = Warehouse(
        name=data.name,
        location=data.location,
        capacity=data.capacity or 5000,
        shipping_cost_per_unit=data.shipping_cost_per_unit or 150.0,
        avg_delivery_days=data.avg_delivery_days or 3,
    )
    db.add(w)
    await db.commit()
    await db.refresh(w)
    return {
        "id": str(w.id),
        "name": w.name,
        "location": w.location,
        "capacity": w.capacity,
        "shipping_cost_per_unit": w.shipping_cost_per_unit,
        "avg_delivery_days": w.avg_delivery_days,
    }

@router.patch("/{warehouse_id}")
async def update_warehouse(
    warehouse_id: UUID,
    data: WarehouseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES_MANAGER)),
):
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    w = result.scalar_one_or_none()
    if not w:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(w, key, value)

    await db.commit()
    await db.refresh(w)
    return {"status": "success", "message": f"Warehouse {warehouse_id} updated"}

@router.delete("/{warehouse_id}")
async def delete_warehouse(
    warehouse_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    w = result.scalar_one_or_none()
    if not w:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    await db.delete(w)
    await db.commit()
    return {"status": "success", "message": f"Warehouse {warehouse_id} deleted"}
