import asyncio
import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from datetime import date, timedelta
from app.football_api import ESPNFootballAPI

async def test_recent_dates():
    """Test ESPN API with recent dates to see if it's working"""
    
    football_api = ESPNFootballAPI()
    
    print(f'📅 Today is: {date.today()}')
    
    # Test the last 5 days
    for i in range(5):
        test_date = date.today() - timedelta(days=i)
        print(f'\n🔍 Testing {test_date}...')
        
        try:
            fixtures_by_league = await football_api.get_matches_for_date(test_date)
            
            if fixtures_by_league:
                print(f'✅ Found {len(fixtures_by_league)} leagues with matches:')
                for league_name, matches in fixtures_by_league.items():
                    print(f'  {league_name}: {len(matches)} matches')
                    # Check for AFCON
                    if 'afcon' in league_name.lower() or 'african' in league_name.lower():
                        print(f'    🏆 AFCON FOUND!')
                        for match in matches[:3]:
                            print(f'      {match["home_team"]} vs {match["away_team"]}')
            else:
                print(f'❌ No matches found')
                
        except Exception as e:
            print(f'❌ Error: {e}')

    # Also test December 24, 2025 (yesterday from the ESPN URL date)
    test_date = date(2025, 12, 24)
    print(f'\n🔍 Testing December 24, 2025...')
    
    try:
        fixtures_by_league = await football_api.get_matches_for_date(test_date)
        
        if fixtures_by_league:
            print(f'✅ Found {len(fixtures_by_league)} leagues with matches:')
            for league_name, matches in fixtures_by_league.items():
                print(f'  {league_name}: {len(matches)} matches')
                # Check for AFCON
                if 'afcon' in league_name.lower() or 'african' in league_name.lower():
                    print(f'    🏆 AFCON FOUND!')
                    for match in matches[:3]:
                        print(f'      {match["home_team"]} vs {match["away_team"]}')
        else:
            print(f'❌ No matches found')
            
    except Exception as e:
        print(f'❌ Error: {e}')

if __name__ == "__main__":
    asyncio.run(test_recent_dates())