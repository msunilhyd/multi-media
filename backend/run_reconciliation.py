import asyncio
from app.scheduler import reconcile_todays_matches

async def main():
    print("Running manual reconciliation job...")
    await reconcile_todays_matches()
    print("\nReconciliation complete!")

if __name__ == "__main__":
    asyncio.run(main())
