import asyncio
import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from datetime import date, timedelta
from app.football_api import ESPNFootballAPI

async def check_upcoming_afcon():
    """Check if there are any upcoming AFCON matches in the next 7 days"""
    
    football_api = ESPNFootballAPI()
    
    today = date.today()
    print(f'🔍 Checking for upcoming AFCON matches (today: {today})')
    
    total_afcon_matches = 0
    
    for i in range(7):
        check_date = today + timedelta(days=i)
        print(f'\n📅 Checking {check_date}...')
        
        try:
            fixtures_by_league = await football_api.get_matches_for_date(check_date)
            
            # Look for AFCON matches
            afcon_matches = []
            for league_name, matches in fixtures_by_league.items():
                if 'AFCON' in league_name or 'African Cup of Nations' in league_name:
                    afcon_matches.extend(matches)
                    print(f'✅ Found {len(matches)} AFCON matches in {league_name}')
                    
            if afcon_matches:
                total_afcon_matches += len(afcon_matches)
                for match in afcon_matches[:3]:  # Show first 3
                    status = match.get('status', 'unknown')
                    time = match.get('match_time', 'TBD')
                    print(f'   ⚽ {match["home_team"]} vs {match["away_team"]} | {time} | Status: {status}')
            else:
                print(f'❌ No AFCON matches found')
                
            # Also show other leagues for context
            if fixtures_by_league:
                print(f'   Other leagues: {list(fixtures_by_league.keys())[:5]}...')
                
        except Exception as e:
            print(f'❌ Error checking {check_date}: {e}')
    
    print(f'\n🎯 Total upcoming AFCON matches found: {total_afcon_matches}')
    
    if total_afcon_matches == 0:
        print(f'💡 This means either:')
        print(f'   1. AFCON tournament has no matches scheduled for next 7 days')
        print(f'   2. ESPN API doesn\'t have upcoming AFCON fixtures yet')
        print(f'   3. Tournament may be on break/between match days')

if __name__ == "__main__":
    asyncio.run(check_upcoming_afcon())