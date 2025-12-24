const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

export interface ScrapeResponse {
  success: boolean;
  message: string;
  matches_found: number;
  leagues_found: number;
}

export interface YouTubeSearchResponse {
  success: boolean;
  message: string;
  highlights_found: number;
}

export interface MatchForHighlights {
  id: number;
  home_team: string;
  away_team: string;
  league_name: string;
}

export interface YouTubeCostEstimate {
  matches_to_process: number;
  matches_skipped: number;
  estimated_units: number;
  estimated_units_min: number;
  estimated_units_max: number;
  daily_quota: number;
  matches: MatchForHighlights[];
  message: string;
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

export async function scrapeMatches(targetDate?: string, force: boolean = false): Promise<ScrapeResponse> {
  const params = new URLSearchParams();
  if (targetDate) params.append('target_date', targetDate);
  if (force) params.append('force_refresh', 'true');
  
  const response = await fetch(
    `${API_BASE_URL}/api/matches/scrape?${params.toString()}`
  );
  if (!response.ok) throw new Error('Failed to scrape matches');
  return response.json();
}

export const fetchMatchesByDate = async (date: string): Promise<Match[]> => {
  const response = await fetch(`${API_BASE_URL}/api/matches?date=${date}`);
  if (!response.ok) {
    throw new Error('Failed to fetch matches');
  }
  return response.json();
};

export async function scrapeMatchesRange(days: number = 4): Promise<ScrapeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/matches/scrape-range?days=${days}`);
  if (!response.ok) throw new Error('Failed to fetch matches');
  return response.json();
}

export async function previewYesterdayHighlights(): Promise<YouTubeCostEstimate> {
  const response = await fetch(`${API_BASE_URL}/api/matches/yesterday-highlights/preview`);
  if (!response.ok) throw new Error('Failed to preview highlights');
  return response.json();
}

export async function confirmYesterdayHighlights(): Promise<YouTubeSearchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/matches/yesterday-highlights/confirm`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}

export async function fetchYesterdayHighlights(): Promise<YouTubeSearchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/matches/yesterday-highlights`);
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}

export async function fetchHighlightsGrouped(date?: string): Promise<HighlightsGroupedByLeague[]> {
  const params = date ? `?match_date=${date}` : '';
  const response = await fetch(`${API_BASE_URL}/api/highlights${params}`);
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}

export async function fetchAllHighlightsGrouped(): Promise<HighlightsGroupedByLeague[]> {
  // Use local API proxy to avoid CORS issues
  const response = await fetch(`/api/highlights`);
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}

export async function fetchHighlightsByLeague(leagueSlug: string, date?: string): Promise<HighlightsGroupedByLeague> {
  const params = date ? `?match_date=${date}` : '';
  const response = await fetch(`${API_BASE_URL}/api/highlights/${leagueSlug}${params}`);
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}

export async function fetchAllHighlights(date?: string): Promise<YouTubeSearchResponse> {
  const params = date ? `?match_date=${date}` : '';
  const response = await fetch(`${API_BASE_URL}/api/highlights/fetch-all${params}`);
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}

export async function fetchHighlightsForMatch(matchId: number): Promise<YouTubeSearchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/matches/${matchId}/fetch-highlights`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}

export async function fetchAvailableDates(): Promise<string[]> {
  // Use local API proxy to avoid CORS issues
  const response = await fetch(`/api/dates`);
  if (!response.ok) throw new Error('Failed to fetch dates');
  return response.json();
}

export async function scrapeMatchesRangePast(days: number = 7): Promise<ScrapeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/matches/scrape-range?days=${days}&direction=past`);
  if (!response.ok) throw new Error('Failed to fetch past matches');
  return response.json();
}

export async function fetchHighlightsGroupedByDate(date: string): Promise<HighlightsGroupedByLeague[]> {
  // Use local API proxy to avoid CORS issues
  const response = await fetch(`/api/highlights?match_date=${date}`);
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}

// Upcoming matches types and API
export interface UpcomingMatch {
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  match_time: string | null;
  league_name: string;
  status: string;
}

export interface UpcomingMatchesByDate {
  date: string;
  date_label: string;
  matches: UpcomingMatch[];
}

export async function fetchUpcomingMatches(days: number = 7): Promise<UpcomingMatchesByDate[]> {
  const response = await fetch(`${API_BASE_URL}/api/matches/upcoming?days=${days}`);
  if (!response.ok) throw new Error('Failed to fetch upcoming matches');
  return response.json();
}

// Teams types and API
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
  
  const response = await fetch(`/api/highlights${params.toString() ? `?${params}` : ''}`);
  if (!response.ok) throw new Error('Failed to fetch highlights');
  return response.json();
}
