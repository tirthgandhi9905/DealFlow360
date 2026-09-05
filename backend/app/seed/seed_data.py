"""Seed script — run with: python -m app.seed.seed_data"""
import asyncio
from app.database import engine, async_session, Base
from app.models import *  # noqa


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[seed] Tables created")

    # TODO: Add 100 customers, 50 products, 500 deals, 3 warehouses
    print("[seed] Seeding data... (implement per plan)")
    print("[seed] Done")


if __name__ == "__main__":
    asyncio.run(seed())
