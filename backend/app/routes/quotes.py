from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db

router = APIRouter()


@router.get("/")
async def list_quotes(db: AsyncSession = Depends(get_db)):
    return {"module": "quotes", "status": "ready", "items": []}
