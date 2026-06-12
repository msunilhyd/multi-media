'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AlertCircle, Video, Calendar, Trophy, Clock } from 'lucide-react';
import Header from '@/components/Header';
import LeagueSection from '@/components/LeagueSection';
import LoadingSpinner from '@/components/LoadingSpinner';
import ComingSoon from '@/components/ComingSoon';
import TeamSelector from '@/components/TeamSelector';
import {
  HighlightsGroupedByLeague,
  Match,
  fetchAvailableDates,
  fetchHighlightsGroupedByDate,
  fetchFavoriteTeams,
  replaceFavoriteTeams,
  FavoriteTeamCreate,
  fetchRecentHighlightsByLeague,
} from '@/lib/api';

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
  const { data: session } = useSession();
  const user = session?.user;
  const token = (session as any)?.accessToken || (session as any)?.access_token;
  const [highlightsData, setHighlightsData] = useState<HighlightsGroupedByLeague[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState<string>(getTodayString());
  const [expandedLeagueIds, setExpandedLeagueIds] = useState<Set<number>>(new Set());
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showWeek, setShowWeek] = useState(false);

  useEffect(() => {
    setShowWeek(true);
    setSelectedDate(null);
    handleWeekSelect();
  }, []);

  useEffect(() => {
    if (highlightsData.length > 0) {
      for (const leagueGroup of highlightsData) {
        for (const match of leagueGroup.matches) {
          if (match.highlights && match.highlights.length > 0) {
            const firstLeagueId = leagueGroup.league.id;
            setExpandedLeagueIds(prev => new Set([...prev, firstLeagueId]));
            return;
          }
        }
      }
    }
  }, [highlightsData.length > 0]);

  const loadAvailableDates = async () => {
    try {
      const dates = await fetchAvailableDates();
      setAvailableDates(dates);
    } catch (err) {
      console.error('Failed to load dates:', err);
    }
  };

  const loadHighlights = async (date: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchHighlightsGroupedByDate(date, 'pga');
      setHighlightsData(data);
    } catch (err) {
      console.error('Error loading highlights:', err);
      setError('Failed to load highlights for this date.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTodayClick = () => {
    const today = getTodayString();
    setCalendarDate(today);
    setSelectedDate(today);
    setShowWeek(false);
    loadHighlights(today);
  };

  const handleYesterdayClick = () => {
    const yesterday = getYesterdayString();
    setCalendarDate(yesterday);
    setSelectedDate(yesterday);
    setShowWeek(false);
    loadHighlights(yesterday);
  };

  const handleWeekSelect = () => {
    const sevenDaysAgo = getLastSevenDaysRange();
    setCalendarDate(sevenDaysAgo);
    setSelectedDate(sevenDaysAgo);
    setShowWeek(true);
    loadHighlights(sevenDaysAgo);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setCalendarDate(date);
    setSelectedDate(date);
    setShowWeek(false);
    loadHighlights(date);
  };

  const handlePreviousDay = () => {
    if (!calendarDate) return;
    const current = new Date(calendarDate);
    const previous = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1);
    const dateString = previous.toISOString().split('T')[0];
    setCalendarDate(dateString);
    setSelectedDate(dateString);
    setShowWeek(false);
    loadHighlights(dateString);
  };

  const handleNextDay = () => {
    if (!calendarDate) return;
    const current = new Date(calendarDate);
    const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
    const dateString = next.toISOString().split('T')[0];
    setCalendarDate(dateString);
    setSelectedDate(dateString);
    setShowWeek(false);
    loadHighlights(dateString);
  };

  const toggleLeagueExpanded = (leagueId: number) => {
    setExpandedLeagueIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leagueId)) {
        newSet.delete(leagueId);
      } else {
        newSet.add(leagueId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg">
              <span className="text-3xl">⛳</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">PGA Golf</h1>
              <p className="text-gray-400 mt-1">Professional Golf Association Highlights</p>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={handleTodayClick}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedDate === getTodayString() && !showWeek
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={handleYesterdayClick}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedDate === getYesterdayString() && !showWeek
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={handleWeekSelect}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                showWeek
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              This Week
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousDay}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              title="Previous day"
            >
              <Calendar size={20} />
            </button>
            <input
              type="date"
              value={calendarDate}
              onChange={handleDateChange}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={handleNextDay}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              title="Next day"
            >
              <Calendar size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading && <LoadingSpinner />}

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {!isLoading && highlightsData.length === 0 && !error && (
          <div className="text-center py-12">
            <Video className="mx-auto text-gray-500 mb-4" size={48} />
            <p className="text-gray-400 text-lg">No highlights available for this date</p>
          </div>
        )}

        {!isLoading && highlightsData.length > 0 && (
          <div className="space-y-6">
            {highlightsData.map((leagueGroup) => (
              <LeagueSection
                key={leagueGroup.league.id}
                leagueData={leagueGroup}
                isExpanded={expandedLeagueIds.has(leagueGroup.league.id)}
                onToggle={() => toggleLeagueExpanded(leagueGroup.league.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
