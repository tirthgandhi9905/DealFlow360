from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db

router = APIRouter()


@router.get("/")
async def list_dashboard(db: AsyncSession = Depends(get_db)):
    return {"module": "dashboard", "status": "ready", "items": []}
