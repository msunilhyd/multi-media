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
  fetchAvailableDates,
  fetchHighlightsGroupedByDate,
  fetchFavoriteTeams,
  replaceFavoriteTeams,
  FavoriteTeamCreate,
} from '@/lib/api';

export default function FootballPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const token = (session as any)?.accessToken; // Get token from session if available
  const [highlightsData, setHighlightsData] = useState<HighlightsGroupedByLeague[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expandedLeagueIds, setExpandedLeagueIds] = useState<Set<number>>(new Set());
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSavingFavorites, setIsSavingFavorites] = useState(false);

  // Load favorite teams from localStorage or user account on mount
  useEffect(() => {
    const loadFavorites = async () => {
      if (user && token) {
        // Load from user account
        try {
          const favorites = await fetchFavoriteTeams(token);
          const teamNames = favorites.map(f => f.team_name);
          setSelectedTeams(teamNames);
          localStorage.setItem('favoriteTeams', JSON.stringify(teamNames));
        } catch (err) {
          console.error('Failed to load favorite teams:', err);
          // Fall back to localStorage
          const stored = localStorage.getItem('favoriteTeams');
          if (stored) {
            setSelectedTeams(JSON.parse(stored));
          }
        }
      } else {
        // Load from localStorage
        const stored = localStorage.getItem('favoriteTeams');
        if (stored) {
          setSelectedTeams(JSON.parse(stored));
        }
      }
    };
    loadFavorites();
  }, [user, token]);

  const loadAvailableDates = async () => {
    try {
      const dates = await fetchAvailableDates();
      setAvailableDates(dates);
    } catch (err) {
      console.error('Failed to load dates:', err);
    }
  };

  const loadHighlights = async (date: string, teams?: string[]) => {
    try {
      setIsLoading(true);
      setError(null);
      // Clear previous data immediately to avoid showing stale data
      setHighlightsData([]);
      
      const data = await fetchHighlightsGroupedByDate(date);
      
      // Filter by teams if provided
      let filteredData = data;
      if (teams && teams.length > 0) {
        filteredData = data.map(league => ({
          ...league,
          matches: league.matches.filter(match => 
            teams.includes(match.home_team) || teams.includes(match.away_team)
          )
        })).filter(league => league.matches.length > 0);
      }
      
      setHighlightsData(filteredData);
      // Set the first league as expanded by default
      if (filteredData.length > 0) {
        setExpandedLeagueIds(new Set([filteredData[0].league.id]));
      }
      return filteredData;
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
    setCalendarDate(date);
    await loadHighlights(date, selectedTeams.length > 0 ? selectedTeams : undefined);
  };

  const handleTeamsChange = async (teams: string[]) => {
    setSelectedTeams(teams);
    localStorage.setItem('favoriteTeams', JSON.stringify(teams));
    
    // Reload highlights with new filter
    if (selectedDate) {
      await loadHighlights(selectedDate, teams.length > 0 ? teams : undefined);
    }
    
    // Show save dialog only if user is logged in, has a token, and has selected teams
    if (user && token && teams.length > 0) {
      setShowSaveDialog(true);
    }
  };

  const handleSaveFavorites = async () => {
    if (!user) {
      alert('Please log in to save favorite teams.');
      setShowSaveDialog(false);
      return;
    }
    
    if (!token) {
      console.error('No access token available');
      alert('Authentication token not found. Please log in again.');
      setShowSaveDialog(false);
      return;
    }
    
    try {
      setIsSavingFavorites(true);
      const favoritesToSave: FavoriteTeamCreate[] = selectedTeams.map(team => ({
        team_name: team,
        league_id: null,
      }));
      
      console.log('Saving favorites with token:', token ? 'Token available' : 'No token');
      await replaceFavoriteTeams(token, favoritesToSave);
      setShowSaveDialog(false);
      alert('Favorite teams saved successfully!');
    } catch (err: any) {
      console.error('Failed to save favorites:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Please try again.';
      alert(`Failed to save favorites: ${errorMessage}`);
    } finally {
      setIsSavingFavorites(false);
    }
  };



  useEffect(() => {
    const initializePage = async () => {
      // Load available dates first
      const dates = await fetchAvailableDates();
      setAvailableDates(dates);
      
      // Try to find the most recent date with highlights
      const todayObj = new Date();
      const today = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate()).toISOString().split('T')[0];
      const yesterday = getYesterdayString();
      
      let defaultDate = yesterday; // Always default to yesterday
      
      // Check if yesterday has highlights, otherwise use today, then most recent
      if (dates.includes(yesterday)) {
        defaultDate = yesterday;
      } else if (dates.includes(today)) {
        defaultDate = today;
      } else if (dates.length > 0) {
        // Use the most recent date with highlights
        defaultDate = dates[0];
      }
      
      setSelectedDate(defaultDate);
      await loadHighlights(defaultDate, selectedTeams.length > 0 ? selectedTeams : undefined);
    };
    
    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeams]);

  // Helper function to get yesterday's date string consistently (local timezone)
  const getYesterdayString = () => {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  // Format date for display (e.g., "Dec 20" or "Today")
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const todayString = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const yesterdayString = getYesterdayString();
    
    const isToday = dateStr === todayString;
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Select Date</h3>
            </div>
            <TeamSelector selectedTeams={selectedTeams} onTeamsChange={handleTeamsChange} />
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
                value={calendarDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setCalendarDate(e.target.value);
                    setShowComingSoon(false);
                    handleDateSelect(e.target.value);
                  }
                }}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => setShowComingSoon(!showComingSoon)}
              className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                showComingSoon
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
          {selectedTeams.length > 0 && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Showing matches for: <span className="font-medium text-blue-600 dark:text-blue-400">{selectedTeams.length} team(s)</span>
            </div>
          )}
        </div>

        {/* Save Favorites Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                Save Favorite Teams?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Would you like to save your selected teams ({selectedTeams.length} team(s)) to your account? 
                This will sync across all your devices.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                Your teams are already saved locally on this device. Saving to your account is optional.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Keep Local Only
                </button>
                <button
                  onClick={handleSaveFavorites}
                  disabled={isSavingFavorites}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingFavorites ? 'Saving...' : 'Save to Account'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Coming Soon Section - shown when toggled */}
        {showComingSoon && <ComingSoon selectedTeams={selectedTeams} />}
        
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
                Highlights for {formatDateLabel(selectedDate || getYesterdayString())}
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
