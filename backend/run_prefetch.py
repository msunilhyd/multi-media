import asyncio
from app.scheduler import prefetch_upcoming_matches

async def main():
    print("Running prefetch_upcoming_matches...")
    await prefetch_upcoming_matches()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
