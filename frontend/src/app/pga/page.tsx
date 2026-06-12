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

export default function PGAPage() {
  const [highlights, setHighlights] = useState<HighlightsGroupedByLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'today' | 'yesterday' | 'week' | 'custom'>('today');

  const loadHighlights = async (date: string) => {
    try {
      setLoading(true);
      const data = await fetchHighlightsGroupedByDate(date, 'pga');
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
    const sevenDaysAgo = getLastSevenDaysRange();
    setSelectedDate(sevenDaysAgo);
    setFilterMode('week');
    loadHighlights(sevenDaysAgo);
  }, []);

  const handleFilterChange = (mode: 'today' | 'yesterday' | 'week' | 'custom') => {
    setFilterMode(mode);
    let dateToLoad = getTodayString();

    if (mode === 'yesterday') {
      dateToLoad = getYesterdayString();
    } else if (mode === 'week') {
      dateToLoad = getLastSevenDaysRange();
    }

    setSelectedDate(dateToLoad);
    loadHighlights(dateToLoad);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    setFilterMode('custom');
    loadHighlights(date);
  };

  const handlePreviousDay = () => {
    const current = new Date(selectedDate);
    const previous = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1);
    const dateString = previous.toISOString().split('T')[0];
    setSelectedDate(dateString);
    setFilterMode('custom');
    loadHighlights(dateString);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
    const dateString = next.toISOString().split('T')[0];
    setSelectedDate(dateString);
    setFilterMode('custom');
    loadHighlights(dateString);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg">
              <span className="text-2xl">⛳</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">PGA Golf</h1>
              <p className="text-slate-400 mt-1">Professional Golf Association Highlights</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleFilterChange('today')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterMode === 'today'
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => handleFilterChange('yesterday')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterMode === 'yesterday'
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => handleFilterChange('week')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterMode === 'week'
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Last 7 Days
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePreviousDay}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={handleNextDay}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin">
              <Zap className="text-amber-500" size={32} />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!loading && highlights.length === 0 && !error && (
          <div className="text-center py-12">
            <Calendar className="mx-auto text-slate-500 mb-4" size={48} />
            <p className="text-slate-400 text-lg">No highlights available for this date</p>
          </div>
        )}

        {!loading && highlights.length > 0 && (
          <div className="space-y-8">
            {highlights.map((group) => {
              const allHighlights = group.matches.flatMap(match => match.highlights);
              return (
                <div key={group.league.id}>
                  <h2 className="text-2xl font-bold text-white mb-4">{group.league.name}</h2>
                  <HighlightsGrid highlights={allHighlights} showMatchInfo={true} />
                </div>
              );
            })}
          </div>
        )}
      </main>

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}
