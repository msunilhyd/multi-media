import asyncio
import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from datetime import date
from app.football_api import ESPNFootballAPI

async def debug_espn_api():
    """Debug the ESPN API to see what's available for December 25, 2025"""
    
    football_api = ESPNFootballAPI()
    target_date = date(2025, 12, 25)
    
    print(f'🔍 Debugging ESPN API for {target_date}...')
    
    try:
        # Get all matches for the date
        fixtures_by_league = await football_api.get_matches_for_date(target_date)
        
        print(f'\n📊 Found {len(fixtures_by_league)} leagues with matches:')
        
        for league_name, matches in fixtures_by_league.items():
            print(f'  {league_name}: {len(matches)} matches')
            
            # Print first few matches for each league
            for i, match in enumerate(matches[:2]):
                print(f'    {i+1}. {match["home_team"]} vs {match["away_team"]} - {match.get("status", "unknown")}')
        
        print(f'\n🔍 Looking for AFCON-related leagues...')
        afcon_related = []
        for league_name in fixtures_by_league.keys():
            if any(keyword in league_name.lower() for keyword in ['afcon', 'african', 'africa', 'cup', 'nations', 'caf']):
                afcon_related.append(league_name)
                
        if afcon_related:
            print(f'✅ Found AFCON-related leagues: {afcon_related}')
        else:
            print('❌ No AFCON-related leagues found')
            
        # Also check what leagues ESPN supports for CAF
        print(f'\n🔍 Checking CAF leagues in ESPN API...')
        
        # Check the LEAGUES mapping
        print(f'📋 Available ESPN leagues:')
        for key, name in football_api.LEAGUES.items():
            if 'caf' in key.lower() or 'afcon' in name.lower() or 'african' in name.lower():
                print(f'  {key}: {name}')
    
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_espn_api())