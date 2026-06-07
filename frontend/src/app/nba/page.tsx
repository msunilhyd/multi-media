'use client';

import { useEffect, useState } from 'react';
import { Calendar, Zap } from 'lucide-react';
import Header from '@/components/Header';
import HighlightsGrid from '@/components/HighlightsGrid';
import Toast from '@/components/Toast';
import { fetchHighlightsGroupedByDate } from '@/lib/api';
import type { HighlightsGroupedByLeague } from '@/lib/api';

export default function NBAPage() {
  const [highlights, setHighlights] = useState<HighlightsGroupedByLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadHighlights = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        
        const data = await fetchHighlightsGroupedByDate(today, 'nba');
        setHighlights(data);
        setError(null);
      } catch (err) {
        console.error('Error loading NBA highlights:', err);
        setError('Failed to load NBA highlights. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadHighlights();
  }, []);

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    
    try {
      setLoading(true);
      const data = await fetchHighlightsGroupedByDate(newDate, 'nba');
      setHighlights(data);
      setError(null);
    } catch (err) {
      console.error('Error loading highlights:', err);
      setError('Failed to load highlights for this date.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl">🏀</div>
            <h1 className="text-4xl font-bold text-white">NBA Highlights</h1>
          </div>
          <p className="text-slate-400">Watch the latest NBA game highlights from House of Highlights</p>
        </div>

        {/* Date Filter */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
            <Calendar className="w-5 h-5 text-orange-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="bg-transparent text-white outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Zap className="w-4 h-4 text-orange-400" />
            <span>Powered by House of Highlights</span>
          </div>
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
                {leagueGroup.matches.map((match) => (
                  <div key={match.id} className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-300 mb-4">
                      {match.home_team} vs {match.away_team}
                    </h3>
                    {match.highlights.length > 0 ? (
                      <HighlightsGrid highlights={match.highlights} />
                    ) : (
                      <p className="text-slate-500">No highlights available for this match</p>
                    )}
                  </div>
                ))}
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
