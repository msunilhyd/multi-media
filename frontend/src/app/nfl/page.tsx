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

const LEAGUE_PRIORITY: { [key: string]: number } = {
  'NFL': 1,
};

const sortLeaguesByPriority = (leagues: HighlightsGroupedByLeague[]) => {
  return [...leagues].sort((a, b) => {
    const priorityA = LEAGUE_PRIORITY[a.league.name] ?? 999;
    const priorityB = LEAGUE_PRIORITY[b.league.name] ?? 999;
    return priorityA - priorityB;
  });
};

export default function NFLPage() {
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
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSavingFavorites, setIsSavingFavorites] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [seasonStartDate, setSeasonStartDate] = useState<string>('');

  useEffect(() => {
    localStorage.removeItem('favoriteTeams');
    setSelectedTeams([]);
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
            console.log('🏈 [NFL] Auto-loaded first available video:', match.home_team, 'vs', match.away_team);
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

  const loadHighlights = async (date: string, teams?: string[], league?: string, loadMore: boolean = false) => {
    try {
      if (!loadMore) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      if (league && (!teams || teams.length === 0) && !date && !loadMore) {
        const result = await fetchRecentHighlightsByLeague(league, 25);
        setHighlightsData([result]);
        setExpandedLeagueIds(new Set([result.league.id]));
        setHasMore(false);
        setCurrentSearchIndex(0);
        setIsLoading(false);
        setIsLoadingMore(false);
        return [result];
      }

      if (league || (teams && teams.length > 0)) {
        console.log('🔍 Filter active - League:', league, 'Teams:', teams, 'LoadMore:', loadMore);

        if (!loadMore) {
          setHighlightsData([]);
          setCurrentSearchIndex(0);
        }

        const allHighlights: any[] = [];
        const currentDate = new Date(date + 'T12:00:00');

        let seasonStartStr = seasonStartDate;
        if (!seasonStartStr) {
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth();
          const seasonStartYear = currentMonth < 8 ? currentYear - 1 : currentYear;
          const seasonStart = new Date(seasonStartYear, 8, 1);
          seasonStartStr = seasonStart.toISOString().split('T')[0];
          setSeasonStartDate(seasonStartStr);
        }

        console.log(`📅 Searching from index ${loadMore ? currentSearchIndex : 0}`);

        const startIndex = loadMore ? currentSearchIndex : 0;
        const targetCount = 25;
        const batchSize = 7;
        const maxSearchDays = 90;
        let searchIndex = startIndex;

        while (allHighlights.length < targetCount && searchIndex < maxSearchDays) {
          const datesToFetch: string[] = [];

          for (let j = 0; j < batchSize && allHighlights.length < targetCount; j++) {
            const searchDate = new Date(currentDate);
            searchDate.setDate(currentDate.getDate() - (searchIndex + j));
            const dateStr = searchDate.toISOString().split('T')[0];

            if (dateStr < seasonStartStr) {
              console.log('📅 Reached season start, stopping search');
              setHasMore(false);
              break;
            }

            datesToFetch.push(dateStr);
          }

          if (datesToFetch.length === 0) {
            break;
          }

          const fetchPromises = datesToFetch.map(dateStr =>
            fetchHighlightsGroupedByDate(dateStr)
              .then(data => ({ dateStr, data, error: null }))
              .catch(err => ({ dateStr, data: [], error: err }))
          );

          const results = await Promise.all(fetchPromises);

          for (const { dateStr, data, error } of results) {
            if (error) {
              console.error(`Failed to fetch highlights for ${dateStr}:`, error);
              continue;
            }

            console.log(`📅 ${dateStr}: Found ${data.length} leagues`);

            let leagueData = data;
            if (league) {
              leagueData = data.filter(l => l.league.slug === league || l.league.name === league);
              console.log(`  ✅ Found ${leagueData.length} matching league(s)`);
            }

            for (const leagueGroup of leagueData) {
              for (const match of leagueGroup.matches) {
                if (teams && teams.length > 0) {
                  if (!teams.includes(match.home_team) && !teams.includes(match.away_team)) {
                    continue;
                  }
                }
                for (const highlight of match.highlights) {
                  allHighlights.push({ match, highlight, league: leagueGroup.league, date: dateStr });

                  if (allHighlights.length >= targetCount) {
                    break;
                  }
                }
                if (allHighlights.length >= targetCount) {
                  break;
                }
              }
              if (allHighlights.length >= targetCount) {
                break;
              }
            }
          }

          searchIndex += datesToFetch.length;

          if (searchIndex >= maxSearchDays) {
            console.log(`📅 Reached maximum search limit (${maxSearchDays} days)`);
            setHasMore(false);
            break;
          }

          if (allHighlights.length < targetCount && datesToFetch.length < batchSize) {
            console.log('📅 No more dates to search');
            setHasMore(false);
            break;
          }
        }

        console.log(`🎯 Highlights in batch: ${allHighlights.length}, Search index: ${searchIndex}`);

        setCurrentSearchIndex(searchIndex);
        setHasMore(allHighlights.length === targetCount && searchIndex < maxSearchDays);

        if (allHighlights.length > 0) {
          const leagueMap = new Map();
          const existingHighlightIds = new Set();
          if (loadMore) {
            for (const existing of highlightsData) {
              const leagueCopy = {
                league: existing.league,
                matches: existing.matches.map(m => ({ ...m, highlights: [...m.highlights] })),
                total_highlights: existing.total_highlights
              };
              leagueMap.set(existing.league.name, leagueCopy);
              for (const match of existing.matches) {
                for (const h of match.highlights) {
                  existingHighlightIds.add(h.id);
                }
              }
            }
          }
          for (const item of allHighlights) {
            if (existingHighlightIds.has(item.highlight.id)) continue;
            if (!leagueMap.has(item.league.name)) {
              leagueMap.set(item.league.name, {
                league: item.league,
                matches: [],
                total_highlights: 0
              });
            }
            const leagueGroup = leagueMap.get(item.league.name);
            let matchGroup = leagueGroup.matches.find((m: Match) => m.id === item.match.id);
            if (!matchGroup) {
              matchGroup = { ...item.match, highlights: [], date: item.date };
              leagueGroup.matches.push(matchGroup);
            }
            matchGroup.highlights.push(item.highlight);
            leagueGroup.total_highlights++;
          }
          const filteredData = Array.from(leagueMap.values());
          console.log('📊 Final data structure:', filteredData.map(l => ({
            league: l.league.name,
            matches: l.matches.length,
            highlights: l.total_highlights
          })));
          setHighlightsData(filteredData);
          if (filteredData.length > 0 && !loadMore) {
            setExpandedLeagueIds(new Set(filteredData.map(l => l.league.id)));
          }
          return filteredData;
        } else {
          setHasMore(false);
          return [];
        }
      } else {
        setHasMore(false);
        setCurrentSearchIndex(0);
      }

      const data = await fetchHighlightsGroupedByDate(date, 'nfl');
      let filteredData = data;
      if (league) {
        filteredData = data.filter(l => l.league.slug === league || l.league.name === league);
      }
      if (teams && teams.length > 0) {
        filteredData = filteredData.map(league => ({
          ...league,
          matches: league.matches.filter(match =>
            teams.includes(match.home_team) || teams.includes(match.away_team)
          )
        })).filter(league => league.matches.length > 0);
      }
      filteredData = filteredData.map(league => ({
        ...league,
        matches: league.matches.filter(match => match.match_date === date)
      })).filter(league => league.matches.length > 0);
      filteredData = sortLeaguesByPriority(filteredData);
      if (loadMore && highlightsData.length > 0) {
        const leagueMap = new Map();
        const existingHighlightIds = new Set();
        for (const existing of highlightsData) {
          const leagueCopy = {
            league: existing.league,
            matches: existing.matches.map(m => ({ ...m, highlights: [...m.highlights] })),
            total_highlights: existing.total_highlights
          };
          leagueMap.set(existing.league.name, leagueCopy);
          for (const match of existing.matches) {
            for (const h of match.highlights) {
              existingHighlightIds.add(h.id);
            }
          }
        }
        for (const league of filteredData) {
          if (!leagueMap.has(league.league.name)) {
            leagueMap.set(league.league.name, {
              league: league.league,
              matches: [],
              total_highlights: 0
            });
          }
          const leagueGroup = leagueMap.get(league.league.name);
          for (const match of league.matches) {
            let matchGroup = leagueGroup.matches.find((m: Match) => m.id === match.id);
            if (!matchGroup) {
              matchGroup = { ...match, highlights: [] };
              leagueGroup.matches.push(matchGroup);
            }
            for (const highlight of match.highlights) {
              if (!existingHighlightIds.has(highlight.id)) {
                matchGroup.highlights.push(highlight);
                leagueGroup.total_highlights++;
              }
            }
          }
        }
        const mergedData = Array.from(leagueMap.values());
        setHighlightsData(mergedData);
        return mergedData;
      } else {
        setHighlightsData(filteredData);
        if (filteredData.length > 0) {
          setExpandedLeagueIds(new Set(filteredData.map(l => l.league.id)));
        }
        return filteredData;
      }
    } catch (err) {
      setError('Failed to load highlights. Make sure the backend is running.');
      console.error(err);
      return [];
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleDateSelect = async (date: string) => {
    console.log('Date selected:', date);
    setShowWeek(false);
    setShowComingSoon(false);
    setSelectedDate(date);
    setCalendarDate(date);
    setSelectedLeague('');
    await loadHighlights(date, selectedTeams.length > 0 ? selectedTeams : undefined, undefined);
  };

  const handleWeekSelect = async () => {
    console.log('Week selected');
    setShowWeek(true);
    setShowComingSoon(false);
    setSelectedDate(null);
    setSelectedLeague('');

    try {
      setIsLoading(true);
      setError(null);
      setHighlightsData([]);

      const endDate = getTodayString();
      const startDate = getLastSevenDaysRange();

      const dates = [];
      const currentDate = new Date(startDate);
      while (currentDate.toISOString().split('T')[0] <= endDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const leagueMap = new Map<string, any>();

      for (const date of dates) {
        const data = await fetchHighlightsGroupedByDate(date, 'nfl');
        for (const league of data) {
          if (!leagueMap.has(league.league.name)) {
            leagueMap.set(league.league.name, {
              league: league.league,
              matches: [],
              total_highlights: 0
            });
          }
          const existingLeague = leagueMap.get(league.league.name);
          existingLeague.matches.push(...league.matches);
          existingLeague.total_highlights += league.total_highlights || 0;
        }
      }

      let weekHighlights = Array.from(leagueMap.values());

      if (selectedLeague) {
        weekHighlights = weekHighlights.filter(l =>
          l.league.slug === selectedLeague || l.league.name === selectedLeague
        );
      }

      if (selectedTeams && selectedTeams.length > 0) {
        weekHighlights = weekHighlights.map(league => ({
          ...league,
          matches: league.matches.filter((match: Match) =>
            selectedTeams.includes(match.home_team) || selectedTeams.includes(match.away_team)
          )
        })).filter(league => league.matches.length > 0);
      }

      weekHighlights = sortLeaguesByPriority(weekHighlights);

      setHighlightsData(weekHighlights);
      if (weekHighlights.length > 0) {
        setExpandedLeagueIds(new Set(weekHighlights.map(l => l.league.id)));
      }
    } catch (err) {
      setError('Failed to load week highlights. Make sure the backend is running.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamsChange = async (teams: string[]) => {
    setSelectedTeams(teams);
    if (teams.length > 0) {
      setSelectedDate(null);
    }
  };

  const handleTeamSelectionDone = async () => {
    if (selectedTeams.length > 0) {
      setSelectedDate(null);
    }
    if (selectedDate) {
      await loadHighlights(selectedDate, selectedTeams.length > 0 ? selectedTeams : undefined, selectedLeague || undefined);
    }
    if (user && token && selectedTeams.length > 0) {
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
      alert('Authentication token not found. Please log out and log in again.');
      setShowSaveDialog(false);
      return;
    }

    try {
      setIsSavingFavorites(true);
      const favoritesToSave: FavoriteTeamCreate[] = selectedTeams.map(team => ({
        team_name: team,
        league_id: null,
      }));

      console.log('Saving favorites:', {
        teamCount: favoritesToSave.length,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 10)}...` : 'none',
        teams: favoritesToSave.map(t => t.team_name)
      });

      await replaceFavoriteTeams(token, favoritesToSave);
      setShowSaveDialog(false);
      alert('Favorite teams saved successfully!');
    } catch (err: any) {
      console.error('Failed to save favorites:', err);
      const errorMessage = err?.message || 'Unknown error occurred. Please try again.';

      if (errorMessage.includes('expired') || errorMessage.includes('Token has expired')) {
        alert('Your session has expired. Please log out and log in again to save favorites.');
      } else if (errorMessage.includes('Invalid token')) {
        alert('Your session is invalid. Please log out and log in again to save favorites.');
      } else {
        alert(`Failed to save favorites: ${errorMessage}`);
      }
    } finally {
      setIsSavingFavorites(false);
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      const dates = await fetchAvailableDates();
      setAvailableDates(dates);

      if (showWeek) {
        if (selectedTeams.length > 0) {
          await handleWeekSelect();
        }
      } else if (!selectedDate) {
        const todayObj = new Date();
        const today = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate()).toISOString().split('T')[0];
        const yesterday = getYesterdayString();

        let defaultDate = today;

        if (dates.includes(today)) {
          defaultDate = today;
        } else if (dates.includes(yesterday)) {
          defaultDate = yesterday;
        } else if (dates.length > 0) {
          defaultDate = dates[0];
        }

        setSelectedDate(defaultDate);
        await loadHighlights(defaultDate, selectedTeams.length > 0 ? selectedTeams : undefined, selectedLeague || undefined);
      }
    };

    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeams]);

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

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4 flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            NFL Highlights
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-4">
            Watch free NFL game highlights from all teams. Regular season, playoffs, and Super Bowl coverage. Updated daily with the latest match videos and replays.
          </p>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500">
            Free highlights • All NFL teams • Daily updates • Full HD quality • No subscription required
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Filters</h3>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <TeamSelector selectedTeams={selectedTeams} onTeamsChange={handleTeamsChange} onDone={handleTeamSelectionDone} />
            {selectedTeams.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setSelectedTeams([]);
                    if (showWeek) {
                      handleWeekSelect();
                    } else if (selectedDate) {
                      loadHighlights(selectedDate, undefined, undefined);
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition-colors text-sm font-medium"
                >
                  Clear Filters
                </button>
                {selectedTeams.map((team) => (
                  <span
                    key={team}
                    className="flex items-center bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded ml-2 text-sm"
                    style={{ gap: '0.25rem' }}
                  >
                    {team}
                    <button
                      onClick={() => {
                        const newTeams = selectedTeams.filter((t) => t !== team);
                        setSelectedTeams(newTeams);
                        if (newTeams.length === 0) {
                          if (selectedDate) {
                            loadHighlights(selectedDate, undefined, undefined);
                          }
                        } else {
                          if (selectedDate) {
                            loadHighlights(selectedDate, newTeams, undefined);
                          }
                        }
                      }}
                      className="ml-1 text-green-700 dark:text-green-300 hover:text-red-600 focus:outline-none"
                      aria-label={`Remove ${team}`}
                      title={`Remove ${team}`}
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </>
            )}
          </div>
          {selectedTeams.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">{selectedTeams.length} team(s) selected</span>
            </div>
          )}
        </div>

        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Select Date</h3>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const todayStr = getTodayString();
                setShowComingSoon(false);
                handleDateSelect(todayStr);
              }}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                !showComingSoon && !showWeek && selectedDate === getTodayString()
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                const yesterdayStr = getYesterdayString();
                setShowComingSoon(false);
                handleDateSelect(yesterdayStr);
              }}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                !showComingSoon && !showWeek && selectedDate === getYesterdayString()
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={handleWeekSelect}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                showWeek
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              This Week
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
              onClick={() => {
                setShowWeek(false);
                setShowComingSoon(!showComingSoon);
              }}
              className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                showComingSoon
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Clock className="w-4 h-4" />
              Coming Soon
            </button>
            {!showComingSoon && selectedDate && !availableDates.includes(selectedDate) && highlightsData.length === 0 && (
              <span className="text-sm text-amber-600 dark:text-amber-400">
                No highlights found for this date
              </span>
            )}
          </div>
        </div>

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

        {showComingSoon && <ComingSoon selectedTeams={selectedTeams} />}

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
              {showWeek
                ? 'No highlights found for this week. Try selecting a different date.'
                : selectedDate
                ? `No highlights found for ${formatDateLabel(selectedDate)}. Try selecting a different date.`
                : 'Try selecting a date using the date picker above.'}
            </p>
          </div>
        ) : (
          <div>
            {(() => {
              const allMatchDates = highlightsData.flatMap(l => l.matches.map(m => m.match_date));
              const uniqueDates = Array.from(new Set(allMatchDates));
              const isToday = selectedDate === getTodayString();
              const isYesterday = selectedDate === getYesterdayString();
              const isWeek = showWeek && uniqueDates.length > 0;
              if ((isToday && selectedDate) || (isYesterday && selectedDate) || (isWeek && showWeek)) {
                return (
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                      Highlights {showWeek ? '- This Week' : `for ${formatDateLabel(selectedDate || getTodayString())}`}
                    </h2>
                    <span className="text-gray-500 dark:text-gray-400">
                      {highlightsData.reduce((acc, league) => acc + league.total_highlights, 0)} videos available
                    </span>
                  </div>
                );
              }
              return null;
            })()}

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

            {hasMore && !isLoading && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => {
                    if (!isLoadingMore) {
                      const dateToUse = selectedDate || getTodayString();
                      loadHighlights(dateToUse, selectedTeams.length > 0 ? selectedTeams : undefined, selectedLeague || undefined, true);
                    }
                  }}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                >
                  {isLoadingMore && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  )}
                  {isLoadingMore ? 'Loading...' : 'Load More Highlights'}
                </button>
              </div>
            )}
          </div>
        ))}
      </main>

      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            @LinusPlaylists.com
          </p>
        </div>
      </footer>
    </div>
  );
}
