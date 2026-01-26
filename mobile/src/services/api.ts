// Local development backend
// export const API_BASE_URL = 'http://localhost:8000';
// Production backend
export const API_BASE_URL = 'https://multi-media-production.up.railway.app';

export interface League {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  logo_url: string | null;
  display_order: number;
}

export interface Highlight {
  id: number;
  match_id: number;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  channel_title: string | null;
  view_count: number | null;
  duration: string | null;
  is_official: boolean;
}

export interface Match {
  id: number;
  league_id: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  match_time: string | null;
  status: string;
  highlights: Highlight[];
  league?: League;
}

export interface HighlightsGroupedByLeague {
  league: League;
  matches: Match[];
  total_highlights: number;
}

export async function fetchLeagues(): Promise<League[]> {
  const response = await fetch(`${API_BASE_URL}/api/leagues`);
  if (!response.ok) throw new Error('Failed to fetch leagues');
  return response.json();
}

export async function fetchMatches(date?: string, leagueSlug?: string): Promise<Match[]> {
  const params = new URLSearchParams();
  if (date) params.append('match_date', date);
  if (leagueSlug) params.append('league_slug', leagueSlug);
  
  const url = `${API_BASE_URL}/api/matches${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch matches');
  return response.json();
}



export async function fetchAvailableDates(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/matches/dates`);
  if (!response.ok) throw new Error('Failed to fetch dates');
  return response.json();
}

export async function fetchHighlightsGroupedByDate(date: string): Promise<HighlightsGroupedByLeague[]> {
  const response = await fetch(`${API_BASE_URL}/api/highlights?match_date=${date}`);
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}

export interface TeamsByLeague {
  league_id: number;
  league_name: string;
  league_slug: string;
  teams: string[];
}

export async function fetchAllTeams(): Promise<TeamsByLeague[]> {
  const response = await fetch(`${API_BASE_URL}/api/teams/all`);
  if (!response.ok) throw new Error('Failed to fetch teams');
  return response.json();
}

export async function fetchHighlightsGroupedWithTeamFilter(teams: string[], date?: string): Promise<HighlightsGroupedByLeague[]> {
  const params = new URLSearchParams();
  if (date) params.append('match_date', date);
  if (teams.length > 0) params.append('teams', teams.join(','));
  
  const response = await fetch(`${API_BASE_URL}/api/highlights${params.toString() ? `?${params}` : ''}`);
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}

export interface StandingsEntry {
  position: number;
  team: string;
  team_id: string;
  logo: string | null;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form: string;
  qualification: string | null;
  qualification_color: string | null;
}

export interface Standings {
  league_name: string;
  season: string;
  standings: StandingsEntry[];
}

export async function fetchStandings(leagueSlug: string): Promise<Standings> {
  const response = await fetch(`${API_BASE_URL}/api/standings/${leagueSlug}`);
  if (!response.ok) throw new Error('Failed to fetch standings');
  return response.json();
}

export interface Entertainment {
  id: number;
  title: string;
  youtube_video_id: string;
  description: string | null;
  content_type: string;
  start_seconds: number | null;
  end_seconds: number | null;
  duration: number | null;
  thumbnail_url: string | null;
  channel_title: string | null;
  view_count: number | null;
  tags: string[] | null;
  is_featured: boolean;
}

export async function fetchEntertainment(): Promise<Entertainment[]> {
  const response = await fetch(`${API_BASE_URL}/api/entertainment`);
  if (!response.ok) throw new Error('Failed to fetch entertainment');
  return response.json();
}
