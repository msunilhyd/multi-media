const API_BASE_URL = 'https://multi-media-production.up.railway.app';

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

export async function fetchAllHighlightsGrouped(days: number = 7): Promise<HighlightsGroupedByLeague[]> {
  const response = await fetch(`${API_BASE_URL}/api/highlights/all`);
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}

export async function fetchAvailableDates(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/matches/dates`);
  if (!response.ok) throw new Error('Failed to fetch dates');
  return response.json();
}

export async function fetchHighlightsGroupedByDate(date: string): Promise<HighlightsGroupedByLeague[]> {
  const response = await fetch(`${API_BASE_URL}/api/highlights/all?match_date=${date}`);
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}
