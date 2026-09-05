from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db

router = APIRouter()


@router.get("/")
async def list_negotiations(db: AsyncSession = Depends(get_db)):
    return {"module": "negotiations", "status": "ready", "items": []}
