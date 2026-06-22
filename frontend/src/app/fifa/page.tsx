'use client';

import { useEffect, useState } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import Header from '@/components/Header';
import VideoCard from '@/components/VideoCard';
import Toast from '@/components/Toast';
import { fetchHighlightsGroupedByDate } from '@/lib/api';
import type { HighlightsGroupedByLeague } from '@/lib/api';

// FIFA World Cup 2026 Group Standings (updated manually as tournament progresses)
const FIFA_GROUPS: { group: string; teams: { name: string; mp: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; flag: string }[] }[] = [
  { group: 'A', teams: [
    { name: 'Mexico', mp: 2, w: 2, d: 0, l: 0, gf: 4, ga: 1, pts: 6, flag: '🇲🇽' },
    { name: 'South Korea', mp: 2, w: 1, d: 0, l: 1, gf: 2, ga: 2, pts: 3, flag: '🇰🇷' },
    { name: 'Czechia', mp: 2, w: 0, d: 1, l: 1, gf: 1, ga: 2, pts: 1, flag: '🇨🇿' },
    { name: 'South Africa', mp: 2, w: 0, d: 1, l: 1, gf: 1, ga: 3, pts: 1, flag: '🇿🇦' },
  ]},
  { group: 'B', teams: [
    { name: 'Canada', mp: 2, w: 2, d: 0, l: 0, gf: 8, ga: 1, pts: 6, flag: '🇨🇦' },
    { name: 'Switzerland', mp: 2, w: 1, d: 0, l: 1, gf: 4, ga: 2, pts: 3, flag: '🇨🇭' },
    { name: 'Bosnia & Herz.', mp: 2, w: 0, d: 0, l: 2, gf: 2, ga: 8, pts: 0, flag: '🇧🇦' },
    { name: 'Qatar', mp: 2, w: 0, d: 0, l: 2, gf: 0, ga: 3, pts: 0, flag: '🇶🇦' },
  ]},
  { group: 'C', teams: [
    { name: 'Morocco', mp: 2, w: 1, d: 0, l: 1, gf: 2, ga: 1, pts: 3, flag: '🇲🇦' },
    { name: 'Brazil', mp: 2, w: 1, d: 0, l: 1, gf: 4, ga: 2, pts: 3, flag: '🇧🇷' },
    { name: 'Scotland', mp: 2, w: 0, d: 0, l: 2, gf: 0, ga: 2, pts: 0, flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    { name: 'Haiti', mp: 2, w: 0, d: 0, l: 2, gf: 0, ga: 1, pts: 0, flag: '🇭🇹' },
  ]},
  { group: 'D', teams: [
    { name: 'Paraguay', mp: 2, w: 1, d: 0, l: 1, gf: 2, ga: 1, pts: 3, flag: '🇵🇾' },
    { name: 'USA', mp: 2, w: 1, d: 0, l: 1, gf: 3, ga: 2, pts: 3, flag: '🇺🇸' },
    { name: 'Türkiye', mp: 2, w: 1, d: 0, l: 1, gf: 1, ga: 2, pts: 3, flag: '🇹🇷' },
    { name: 'Australia', mp: 2, w: 0, d: 0, l: 2, gf: 1, ga: 2, pts: 0, flag: '🇦🇺' },
  ]},
  { group: 'E', teams: [
    { name: 'Germany', mp: 2, w: 2, d: 0, l: 0, gf: 6, ga: 1, pts: 6, flag: '🇩🇪' },
    { name: 'Ecuador', mp: 2, w: 0, d: 2, l: 0, gf: 0, ga: 0, pts: 2, flag: '🇪🇨' },
    { name: 'Ivory Coast', mp: 2, w: 0, d: 1, l: 1, gf: 1, ga: 3, pts: 1, flag: '🇨🇮' },
    { name: 'Curaçao', mp: 2, w: 0, d: 1, l: 1, gf: 0, ga: 3, pts: 1, flag: '🇨🇼' },
  ]},
  { group: 'F', teams: [
    { name: 'Netherlands', mp: 2, w: 2, d: 0, l: 0, gf: 6, ga: 1, pts: 6, flag: '🇳🇱' },
    { name: 'Japan', mp: 2, w: 1, d: 0, l: 1, gf: 4, ga: 1, pts: 3, flag: '🇯🇵' },
    { name: 'Sweden', mp: 2, w: 0, d: 0, l: 2, gf: 2, ga: 5, pts: 0, flag: '🇸🇪' },
    { name: 'Tunisia', mp: 2, w: 0, d: 0, l: 2, gf: 0, ga: 5, pts: 0, flag: '🇹🇳' },
  ]},
  { group: 'G', teams: [
    { name: 'Belgium', mp: 2, w: 1, d: 0, l: 1, gf: 3, ga: 2, pts: 3, flag: '🇧🇪' },
    { name: 'New Zealand', mp: 2, w: 1, d: 0, l: 1, gf: 2, ga: 2, pts: 3, flag: '🇳🇿' },
    { name: 'Iran', mp: 2, w: 1, d: 0, l: 1, gf: 2, ga: 3, pts: 3, flag: '🇮🇷' },
    { name: 'Egypt', mp: 2, w: 0, d: 0, l: 2, gf: 1, ga: 1, pts: 0, flag: '🇪🇬' },
  ]},
  { group: 'H', teams: [
    { name: 'Spain', mp: 2, w: 2, d: 0, l: 0, gf: 5, ga: 1, pts: 6, flag: '🇪🇸' },
    { name: 'Uruguay', mp: 2, w: 1, d: 0, l: 1, gf: 3, ga: 2, pts: 3, flag: '🇺🇾' },
    { name: 'Saudi Arabia', mp: 2, w: 0, d: 0, l: 2, gf: 1, ga: 3, pts: 0, flag: '🇸🇦' },
    { name: 'Cabo Verde', mp: 2, w: 0, d: 0, l: 2, gf: 0, ga: 3, pts: 0, flag: '🇨🇻' },
  ]},
  { group: 'I', teams: [
    { name: 'France', mp: 2, w: 2, d: 0, l: 0, gf: 5, ga: 0, pts: 6, flag: '🇫🇷' },
    { name: 'Norway', mp: 2, w: 0, d: 1, l: 1, gf: 1, ga: 2, pts: 1, flag: '🇳🇴' },
    { name: 'Senegal', mp: 2, w: 0, d: 1, l: 1, gf: 0, ga: 2, pts: 1, flag: '🇸🇳' },
    { name: 'Iraq', mp: 2, w: 0, d: 0, l: 2, gf: 0, ga: 2, pts: 0, flag: '🇮🇶' },
  ]},
  { group: 'J', teams: [
    { name: 'Argentina', mp: 2, w: 2, d: 0, l: 0, gf: 5, ga: 1, pts: 6, flag: '🇦🇷' },
    { name: 'Algeria', mp: 2, w: 1, d: 0, l: 1, gf: 2, ga: 2, pts: 3, flag: '🇩🇿' },
    { name: 'Austria', mp: 2, w: 0, d: 1, l: 1, gf: 1, ga: 2, pts: 1, flag: '🇦🇹' },
    { name: 'Jordan', mp: 2, w: 0, d: 1, l: 1, gf: 0, ga: 3, pts: 1, flag: '🇯🇴' },
  ]},
  { group: 'K', teams: [
    { name: 'Colombia', mp: 2, w: 1, d: 0, l: 1, gf: 4, ga: 2, pts: 3, flag: '🇨🇴' },
    { name: 'Portugal', mp: 2, w: 1, d: 1, l: 0, gf: 2, ga: 1, pts: 4, flag: '🇵🇹' },
    { name: 'Uzbekistan', mp: 2, w: 0, d: 1, l: 1, gf: 2, ga: 3, pts: 1, flag: '🇺🇿' },
    { name: 'Congo DR', mp: 2, w: 0, d: 0, l: 2, gf: 1, ga: 3, pts: 0, flag: '🇨🇩' },
  ]},
  { group: 'L', teams: [
    { name: 'England', mp: 2, w: 2, d: 0, l: 0, gf: 8, ga: 1, pts: 6, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { name: 'Croatia', mp: 2, w: 0, d: 1, l: 1, gf: 2, ga: 5, pts: 1, flag: '🇭🇷' },
    { name: 'Ghana', mp: 2, w: 0, d: 1, l: 1, gf: 1, ga: 4, pts: 1, flag: '🇬🇭' },
    { name: 'Panama', mp: 2, w: 0, d: 0, l: 2, gf: 0, ga: 1, pts: 0, flag: '🇵🇦' },
  ]},
];

const getTodayString = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];
};

const getYesterdayString = () => {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

const getLastSevenDaysRange = () => {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
  return sevenDaysAgo.toISOString().split('T')[0];
};

export default function FIFAPage() {
  const [highlights, setHighlights] = useState<HighlightsGroupedByLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'today' | 'yesterday' | 'week' | 'custom'>('today');
  const [showStandings, setShowStandings] = useState(true);

  const loadHighlights = async (date: string) => {
    try {
      setLoading(true);
      const data = await fetchHighlightsGroupedByDate(date, 'fifa-world-cup');
      setHighlights(data);
      setError(null);
    } catch (err) {
      console.error('Error loading highlights:', err);
      setError('Failed to load highlights for this date.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load highlights from the past 7 days by default
    // This ensures FIFA matches from earlier in the week are visible
    const sevenDaysAgo = getLastSevenDaysRange();
    setSelectedDate(sevenDaysAgo);
    setFilterMode('week');
    loadHighlights(sevenDaysAgo);
  }, []);

  const handleTodayClick = () => {
    const today = getTodayString();
    setSelectedDate(today);
    setFilterMode('today');
    loadHighlights(today);
  };

  const handleYesterdayClick = () => {
    const yesterday = getYesterdayString();
    setSelectedDate(yesterday);
    setFilterMode('yesterday');
    loadHighlights(yesterday);
  };

  const handleWeekClick = () => {
    const sevenDaysAgo = getLastSevenDaysRange();
    setSelectedDate(sevenDaysAgo);
    setFilterMode('week');
    loadHighlights(sevenDaysAgo);
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    setFilterMode('custom');
    await loadHighlights(newDate);
  };

  const handlePreviousDay = () => {
    const current = new Date(selectedDate);
    const previous = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1);
    const previousStr = previous.toISOString().split('T')[0];
    setSelectedDate(previousStr);
    setFilterMode('custom');
    loadHighlights(previousStr);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
    const nextStr = next.toISOString().split('T')[0];
    setSelectedDate(nextStr);
    setFilterMode('custom');
    loadHighlights(nextStr);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* SEO Content - Always Visible */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <div className="text-4xl">⚽</div>
            FIFA World Cup
          </h1>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto mb-4">
            Watch free FIFA World Cup match highlights from international tournaments. International friendlies, qualifying matches, and tournament highlights. Updated daily with the latest match videos and replays.
          </p>
          <p className="text-sm text-slate-400">
            Free highlights • International matches • Daily updates • Full HD quality • No subscription required
          </p>
        </div>

        {/* Select Date Section */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Select Date</h3>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTodayClick}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                filterMode === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={handleYesterdayClick}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                filterMode === 'yesterday'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={handleWeekClick}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                filterMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              This Week
            </button>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Group Standings Table */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <button
            onClick={() => setShowStandings(!showStandings)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🏆</span>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Group Standings</h2>
              <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">After Matchday 2</span>
            </div>
            {showStandings ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </button>

          {showStandings && (
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {FIFA_GROUPS.map(({ group, teams }) => (
                  <div key={group} className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-amber-500 to-yellow-400 px-3 py-2">
                      <h3 className="font-bold text-gray-900 text-sm">Group {group}</h3>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          <th className="text-left px-2 py-1.5 font-medium w-[40%]">Team</th>
                          <th className="text-center px-1 py-1.5 font-medium">MP</th>
                          <th className="text-center px-1 py-1.5 font-medium">W</th>
                          <th className="text-center px-1 py-1.5 font-medium">D</th>
                          <th className="text-center px-1 py-1.5 font-medium">L</th>
                          <th className="text-center px-1 py-1.5 font-medium">GD</th>
                          <th className="text-center px-1 py-1.5 font-semibold text-gray-700 dark:text-white">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...teams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga)).map((team, idx) => (
                          <tr
                            key={team.name}
                            className={`border-t border-gray-100 dark:border-gray-800 ${
                              idx < 2 ? 'bg-green-50 dark:bg-green-900/10' : ''
                            }`}
                          >
                            <td className="px-2 py-1.5 font-medium text-gray-800 dark:text-gray-200 truncate">
                              <span className="mr-1">{team.flag}</span>{team.name}
                            </td>
                            <td className="text-center px-1 py-1.5 text-gray-600 dark:text-gray-400">{team.mp}</td>
                            <td className="text-center px-1 py-1.5 text-gray-600 dark:text-gray-400">{team.w}</td>
                            <td className="text-center px-1 py-1.5 text-gray-600 dark:text-gray-400">{team.d}</td>
                            <td className="text-center px-1 py-1.5 text-gray-600 dark:text-gray-400">{team.l}</td>
                            <td className="text-center px-1 py-1.5 text-gray-600 dark:text-gray-400">{team.gf - team.ga > 0 ? '+' : ''}{team.gf - team.ga}</td>
                            <td className="text-center px-1 py-1.5 font-bold text-gray-900 dark:text-white">{team.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">🟢 Top 2 teams advance to Round of 32</p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Loading FIFA World Cup highlights...</p>
            </div>
          </div>
        )}

        {/* Highlights - Sorted by upload time, displayed horizontally */}
        {!loading && highlights.length > 0 ? (
          <div>
            {highlights.map((leagueGroup) => {
              // Flatten all highlights with match info, sort by match_date (latest match first)
              const allHighlights = leagueGroup.matches
                .flatMap((match) =>
                  match.highlights.map((hl) => ({
                    ...hl,
                    matchInfo: `${match.home_team} vs ${match.away_team}`,
                    matchDate: match.match_date,
                    matchTime: match.match_time,
                  }))
                )
                .sort((a, b) => {
                  const dateA = a.matchDate ? new Date(a.matchDate).getTime() : 0;
                  const dateB = b.matchDate ? new Date(b.matchDate).getTime() : 0;
                  return dateB - dateA;
                });

              return (
                <div key={leagueGroup.league.id} className="mb-12">
                  <h2 className="text-2xl font-bold text-white mb-6">
                    {leagueGroup.league.name} — {allHighlights.length} highlights
                  </h2>
                  {/* 4-column grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {allHighlights.map((hl) => (
                      <VideoCard key={hl.id} highlight={hl} showMatchInfo />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : !loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No FIFA World Cup highlights available for this date</p>
          </div>
        ) : null}
      </main>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}
