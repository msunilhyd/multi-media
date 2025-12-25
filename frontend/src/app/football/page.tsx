'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Video, Calendar, Trophy, Clock } from 'lucide-react';
import Header from '@/components/Header';
import LeagueSection from '@/components/LeagueSection';
import LoadingSpinner from '@/components/LoadingSpinner';
import ComingSoon from '@/components/ComingSoon';
import {
  HighlightsGroupedByLeague,
  fetchAllHighlightsGrouped,
  fetchAvailableDates,
  fetchHighlightsGroupedByDate,
} from '@/lib/api';

export default function FootballPage() {
  const [highlightsData, setHighlightsData] = useState<HighlightsGroupedByLeague[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedLeagueIds, setExpandedLeagueIds] = useState<Set<number>>(new Set());
  const [showComingSoon, setShowComingSoon] = useState(false);

  const loadAvailableDates = async () => {
    try {
      const dates = await fetchAvailableDates();
      setAvailableDates(dates);
    } catch (err) {
      console.error('Failed to load dates:', err);
    }
  };

  const loadHighlights = async (date?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      // Clear previous data immediately to avoid showing stale data
      setHighlightsData([]);
      
      const data = date 
        ? await fetchHighlightsGroupedByDate(date)
        : await fetchAllHighlightsGrouped();
      
      setHighlightsData(data);
      // Set the first league as expanded by default
      if (data.length > 0) {
        setExpandedLeagueIds(new Set([data[0].league.id]));
      }
      return data;
    } catch (err) {
      setError('Failed to load highlights. Make sure the backend is running.');
      console.error(err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = async (date: string) => {
    console.log('Date selected:', date);
    setSelectedDate(date);
    await loadHighlights(date);
  };

  const handleShowAll = async () => {
    setSelectedDate(null);
    const data = await loadHighlights();
    // Expand all leagues after loading
    if (data && data.length > 0) {
      const allLeagueIds = data.map(item => item.league.id);
      setExpandedLeagueIds(new Set(allLeagueIds));
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      // Load available dates first
      const dates = await fetchAvailableDates();
      setAvailableDates(dates);
      
      // Try to find the most recent date with highlights
      const today = new Date().toISOString().split('T')[0];
      const yesterday = getYesterdayString();
      
      let defaultDate = yesterday; // fallback to yesterday
      
      // Check if today has highlights
      if (dates.includes(today)) {
        defaultDate = today;
      } else if (dates.includes(yesterday)) {
        defaultDate = yesterday;
      } else if (dates.length > 0) {
        // Use the most recent date with highlights
        defaultDate = dates[0];
      }
      
      setSelectedDate(defaultDate);
      await loadHighlights(defaultDate);
    };
    
    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function to get yesterday's date string consistently
  const getYesterdayString = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  // Format date for display (e.g., "Dec 20" or "Today")
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const yesterdayString = getYesterdayString();
    
    const isToday = dateStr === today.toISOString().split('T')[0];
    const isYesterday = dateStr === yesterdayString;
    
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Date Picker Section */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Select Date</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const yesterdayStr = getYesterdayString();
                setShowComingSoon(false);
                handleDateSelect(yesterdayStr);
              }}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                !showComingSoon && selectedDate === getYesterdayString()
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Yesterday
            </button>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setShowComingSoon(false);
                    handleDateSelect(e.target.value);
                  }
                }}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {selectedDate && (
              <button
                onClick={() => {
                  setShowComingSoon(false);
                  handleShowAll();
                }}
                className="px-4 py-2 rounded-lg transition-colors font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Show All
              </button>
            )}
            <button
              onClick={() => setShowComingSoon(!showComingSoon)}
              className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                showComingSoon
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
              }`}
            >
              <Clock className="w-4 h-4" />
              Coming Soon
            </button>
            {!showComingSoon && selectedDate && !availableDates.includes(selectedDate) && (
              <span className="text-sm text-amber-600 dark:text-amber-400">
                No highlights found for this date
              </span>
            )}
          </div>
        </div>

        {/* Coming Soon Section - shown when toggled */}
        {showComingSoon && <ComingSoon />}
        
        {/* Highlights Section - hidden when Coming Soon is shown */}
        {!showComingSoon && (isLoading ? (
          <LoadingSpinner />
        ) : highlightsData.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Video className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No Highlights Available
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {selectedDate 
                ? `No highlights found for ${formatDateLabel(selectedDate)}. Try selecting a different date.`
                : 'Try selecting a date using the date picker above.'}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {selectedDate 
                  ? `Highlights for ${formatDateLabel(selectedDate)}`
                  : 'All Highlights'}
              </h2>
              <span className="text-gray-500 dark:text-gray-400">
                {highlightsData.reduce((acc, league) => acc + league.total_highlights, 0)} videos available
              </span>
            </div>
            
            {highlightsData.map((leagueData) => (
              <LeagueSection 
                key={leagueData.league.id} 
                leagueData={leagueData} 
                isExpanded={expandedLeagueIds.has(leagueData.league.id)}
                onToggle={() => {
                  setExpandedLeagueIds(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(leagueData.league.id)) {
                      newSet.delete(leagueData.league.id);
                    } else {
                      newSet.add(leagueData.league.id);
                    }
                    return newSet;
                  });
                }}
              />
            ))}
          </div>
        ))}
      </main>
      
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Football Highlights Dashboard • Data from ESPN • Videos from YouTube
          </p>
        </div>
      </footer>
    </div>
  );
}
