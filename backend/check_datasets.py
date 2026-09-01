import asyncio
from app.core.database import AsyncSessionLocal
from app.db.models.dataset import Dataset
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Dataset))
        datasets = result.scalars().all()
        for ds in datasets:
            print(f"Dataset {ds.id}: status={ds.status}, error={ds.etl_error}")

if __name__ == "__main__":
    asyncio.run(main())
