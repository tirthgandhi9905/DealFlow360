import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE products ADD COLUMN stock_count INTEGER DEFAULT 100;"))
            print("Successfully added stock_count column.")
        except Exception as e:
            print("Error adding column:", e)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
