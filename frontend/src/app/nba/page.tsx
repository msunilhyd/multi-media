'use client';

import { useEffect, useState } from 'react';
import { Calendar, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import HighlightsGrid from '@/components/HighlightsGrid';
import Toast from '@/components/Toast';
import { fetchHighlightsGroupedByDate } from '@/lib/api';
import type { HighlightsGroupedByLeague } from '@/lib/api';

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

export default function NBAPage() {
  const [highlights, setHighlights] = useState<HighlightsGroupedByLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'today' | 'yesterday' | 'week' | 'custom'>('today');

  const loadHighlights = async (date: string) => {
    try {
      setLoading(true);
      const data = await fetchHighlightsGroupedByDate(date, 'nba');
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
    const today = getTodayString();
    setSelectedDate(today);
    loadHighlights(today);
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* SEO Content - Always Visible */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <div className="text-4xl">🏀</div>
            NBA Highlights
          </h1>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto mb-4">
            Watch free NBA basketball game highlights from all teams. Regular season, playoffs, and championship matches. Updated daily with the latest match videos and replays.
          </p>
          <p className="text-sm text-slate-400">
            Free highlights • All NBA teams • Daily updates • Full HD quality • No subscription required
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <button
            onClick={handleTodayClick}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterMode === 'today'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            Today
          </button>
          <button
            onClick={handleYesterdayClick}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterMode === 'yesterday'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={handleWeekClick}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterMode === 'week'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            This Week
          </button>

          {/* Date Navigation */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handlePreviousDay}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-gray-300"
              title="Previous day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
              <Calendar className="w-5 h-5 text-orange-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="bg-transparent text-white outline-none w-32"
              />
            </div>
            <button
              onClick={handleNextDay}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-gray-300"
              title="Next day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Powered By */}
        <div className="mb-6 flex items-center gap-2 text-slate-400 text-sm">
          <Zap className="w-4 h-4 text-orange-400" />
          <span>Powered by House of Highlights</span>
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Loading NBA highlights...</p>
            </div>
          </div>
        )}

        {/* Highlights Grid */}
        {!loading && highlights.length > 0 ? (
          <div>
            {highlights.map((leagueGroup) => (
              <div key={leagueGroup.league.id} className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {leagueGroup.league.name}
                </h2>
                {leagueGroup.matches.length > 0 ? (
                  leagueGroup.matches.map((match) => (
                    <div key={match.id} className="mb-8">
                      <h3 className="text-lg font-semibold text-slate-300 mb-4">
                        {match.home_team} vs {match.away_team}
                      </h3>
                      {match.highlights && match.highlights.length > 0 ? (
                        <HighlightsGrid highlights={match.highlights} />
                      ) : (
                        <p className="text-slate-500">No highlights available for this match</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">No matches available for this date</p>
                )}
              </div>
            ))}
          </div>
        ) : !loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No NBA highlights available for this date</p>
          </div>
        ) : null}
      </main>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}
