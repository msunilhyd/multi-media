import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import YoutubePlayer from 'react-native-youtube-iframe';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAvailableDates, fetchHighlightsGroupedByDate, fetchHighlightsGroupedWithTeamFilter, fetchStandings, HighlightsGroupedByLeague, Standings, Match, Highlight } from '../services/api';
import TeamSelector from '../components/TeamSelector';
import ComingSoonMatches from '../components/ComingSoonMatches';
import StandingsTable from '../components/StandingsTable';
import { useAuth } from '../contexts/AuthContext';
import { favoritesService } from '../services/favoritesService';

// Leagues that have standings available
const LEAGUES_WITH_STANDINGS = ['premier-league', 'la-liga', 'serie-a', 'bundesliga', 'ligue-1', 'super-league', 'champions-league', 'europa-league'];

// League color mappings matching frontend
const leagueColors: Record<string, { colors: string[]; }> = {
  'premier-league': { colors: ['#1d4ed8', '#3b82f6'] },
  'champions-league': { colors: ['#1e40af', '#2563eb'] },
  'europa-league': { colors: ['#2563eb', '#60a5fa'] },
  'la-liga': { colors: ['#1d4ed8', '#3b82f6'] },
  'serie-a': { colors: ['#1d4ed8', '#3b82f6'] },
  'bundesliga': { colors: ['#1e40af', '#2563eb'] },
  'ligue-1': { colors: ['#1e3a8a', '#1d4ed8'] },
  'fa-cup': { colors: ['#2563eb', '#60a5fa'] },
  'league-cup': { colors: ['#2563eb', '#60a5fa'] },
  'copa-del-rey': { colors: ['#1d4ed8', '#3b82f6'] },
  'coupe-de-france': { colors: ['#1d4ed8', '#3b82f6'] },
  'dfb-pokal': { colors: ['#1e40af', '#2563eb'] },
  'coppa-italia': { colors: ['#1d4ed8', '#3b82f6'] },
  'afcon': { colors: ['#15803d', '#22c55e'] },
  'default': { colors: ['#1d4ed8', '#3b82f6'] },
};

export default function FootballScreen() {
  const { isAuthenticated, token } = useAuth();
  const [highlightsData, setHighlightsData] = useState<HighlightsGroupedByLeague[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedLeagueIds, setExpandedLeagueIds] = useState<Set<number>>(new Set());
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [isSavingFavorites, setIsSavingFavorites] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [leagueStandings, setLeagueStandings] = useState<Record<number, Standings | null>>({});
  const [showStandingsByLeague, setShowStandingsByLeague] = useState<Set<number>>(new Set());
  const [loadingStandingsByLeague, setLoadingStandingsByLeague] = useState<Set<number>>(new Set());
  const [showFullStandingsByLeague, setShowFullStandingsByLeague] = useState<Set<number>>(new Set());
  
  // Helper function to get yesterday's date string
  const getYesterdayString = () => {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  // Helper function to get today's date string
  const getTodayString = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];
  };

  const [calendarDate, setCalendarDate] = useState<string>(getTodayString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const loadFavoriteTeams = async () => {
    try {
      // If authenticated, load from server
      if (isAuthenticated && token) {
        const favorites = await favoritesService.getFavoriteTeams(token);
        const teams = favorites.map(f => f.team_name);
        console.log('Loaded favorite teams from server:', teams);
        setSelectedTeams(teams);
        // Also save to local storage as backup
        await AsyncStorage.setItem('favoriteTeams', JSON.stringify(teams));
        return teams;
      } else {
        // Load from local storage if not authenticated
        const saved = await AsyncStorage.getItem('favoriteTeams');
        if (saved) {
          const teams = JSON.parse(saved);
          console.log('Loaded favorite teams from storage:', teams);
          setSelectedTeams(teams);
          return teams;
        }
      }
      return [];
    } catch (e) {
      console.error('Failed to load saved teams:', e);
      // Fallback to local storage
      try {
        const saved = await AsyncStorage.getItem('favoriteTeams');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (fallbackErr) {
        console.error('Fallback failed:', fallbackErr);
      }
      return [];
    }
  };

  const loadAvailableDates = async () => {
    try {
      const dates = await fetchAvailableDates();
      setAvailableDates(dates);
    } catch (err) {
      console.error('Failed to load dates:', err);
    }
  };

  const loadHighlightsWithTeams = async (date: string | undefined, teams: string[]) => {
    try {
      setIsLoading(true);
      setError(null);
      setHighlightsData([]);
      
      // Use yesterday as default if no date provided
      const targetDate = date || getYesterdayString();
      
      console.log('Loading highlights with teams:', teams, 'and date:', targetDate);
      const data = teams.length > 0
        ? await fetchHighlightsGroupedWithTeamFilter(teams, targetDate)
        : await fetchHighlightsGroupedByDate(targetDate);
      
      console.log('Loaded highlights:', data.length, 'leagues');
      setHighlightsData(data);
      
      if (data.length > 0) {
        setExpandedLeagueIds(new Set([data[0].league.id]));
      }
      
      return data;
    } catch (err) {
      setError('Failed to load highlights');
      console.error(err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const loadHighlights = async (date?: string) => {
    return await loadHighlightsWithTeams(date, selectedTeams);
  };

  const handleTeamsChange = async (teams: string[]) => {
    setSelectedTeams(teams);
  };

  const handleTeamsDone = async () => {
    // Save to local storage
    await AsyncStorage.setItem('favoriteTeams', JSON.stringify(selectedTeams));
    await loadHighlights(selectedDate || undefined);
    
    // Show save dialog if authenticated and has teams selected
    if (isAuthenticated && token && selectedTeams.length > 0) {
      Alert.alert(
        'Save Favorite Teams?',
        `Would you like to save your selected teams (${selectedTeams.length} team(s)) to your account? This will sync across all your devices.`,
        [
          {
            text: 'Keep Local Only',
            style: 'cancel',
          },
          {
            text: 'Save to Account',
            onPress: handleSaveFavorites,
          },
        ]
      );
    }
  };

  const handleSaveFavorites = async () => {
    if (!isAuthenticated || !token) {
      Alert.alert(
        'Login Required',
        'Please login to save your favorite teams to your account',
        [{ text: 'OK' }]
      );
      return;
    }

    if (selectedTeams.length === 0) {
      Alert.alert('No Teams Selected', 'Please select at least one team to save');
      return;
    }

    setIsSavingFavorites(true);
    try {
      const favoritesToSave = selectedTeams.map(team => ({ team_name: team }));
      console.log('Saving favorites:', { teamCount: favoritesToSave.length, hasToken: !!token });
      await favoritesService.replaceFavoriteTeams(token, favoritesToSave);
      Alert.alert('Success', 'Your favorite teams have been saved to your account!');
    } catch (error: any) {
      console.error('Failed to save favorites:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save favorites';
      
      // Check for token expiration
      if (errorMessage.includes('expired') || errorMessage.includes('Token has expired')) {
        Alert.alert('Session Expired', 'Your session has expired. Please log out and log in again to save favorites.');
      } else if (errorMessage.includes('Invalid token')) {
        Alert.alert('Invalid Session', 'Your session is invalid. Please log out and log in again to save favorites.');
      } else {
        Alert.alert('Error', `Failed to save favorites: ${errorMessage}`);
      }
    } finally {
      setIsSavingFavorites(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHighlights(selectedDate || undefined);
    setRefreshing(false);
  };

  const handleDateSelect = async (date: string) => {
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

  const handleStandingsToggle = async (leagueId: number, leagueSlug: string) => {
    const currentShowing = showStandingsByLeague.has(leagueId);
    
    if (!currentShowing && !leagueStandings[leagueId] && !loadingStandingsByLeague.has(leagueId)) {
      const newLoadingSet = new Set(loadingStandingsByLeague);
      newLoadingSet.add(leagueId);
      setLoadingStandingsByLeague(newLoadingSet);
      
      try {
        const data = await fetchStandings(leagueSlug);
        setLeagueStandings(prev => ({ ...prev, [leagueId]: data }));
      } catch (err) {
        console.error('Failed to fetch standings:', err);
      } finally {
        const newLoadingSet = new Set(loadingStandingsByLeague);
        newLoadingSet.delete(leagueId);
        setLoadingStandingsByLeague(newLoadingSet);
      }
    }
    
    const newShowSet = new Set(showStandingsByLeague);
    if (currentShowing) {
      newShowSet.delete(leagueId);
      // Reset full/compact view when closing
      const newFullSet = new Set(showFullStandingsByLeague);
      newFullSet.delete(leagueId);
      setShowFullStandingsByLeague(newFullSet);
    } else {
      newShowSet.add(leagueId);
    }
    setShowStandingsByLeague(newShowSet);
  };

  const handleStandingsCompactToggle = (leagueId: number) => {
    const newFullSet = new Set(showFullStandingsByLeague);
    if (newFullSet.has(leagueId)) {
      newFullSet.delete(leagueId);
    } else {
      newFullSet.add(leagueId);
    }
    setShowFullStandingsByLeague(newFullSet);
  };

  useEffect(() => {
    const initializePage = async () => {
      // Load favorite teams first
      const teams = await loadFavoriteTeams();
      console.log('Teams loaded before highlights:', teams);
      
      const allDates = await fetchAvailableDates();
      
      // Filter out future dates - only show today and past dates
      // Use local timezone to match getTodayString() and getYesterdayString()
      const today = getTodayString();
      const filteredDates = allDates.filter(date => date <= today);
      
      setAvailableDates(filteredDates);
      
      const yesterday = getYesterdayString();
      
      let defaultDate = today; // Default to today instead of yesterday
      
      if (filteredDates.includes(today)) {
        defaultDate = today;
      } else if (filteredDates.includes(yesterday)) {
        defaultDate = yesterday;
      } else if (filteredDates.length > 0) {
        defaultDate = filteredDates[0];
      }
      
      setSelectedDate(defaultDate);
      // Load highlights with the teams that were just loaded
      await loadHighlightsWithTeams(defaultDate, teams);
    };
    
    initializePage();
  }, []);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMatchDateTime = (dateStr: string, timeStr: string | null) => {
    if (!dateStr) return null;
    try {
      // Parse the date string (YYYY-MM-DD format)
      const dateParts = dateStr.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);
      
      let matchDateTime;
      
      if (timeStr) {
        // Parse time (e.g., "14:30" or "14:30:00")
        const timeParts = timeStr.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        // Create date in UTC (assuming the match time from API is in UTC)
        matchDateTime = new Date(Date.UTC(year, month, day, hours, minutes));
      } else {
        matchDateTime = new Date(Date.UTC(year, month, day, 12, 0));
      }
      
      // Format to user's local timezone
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const matchDate = new Date(matchDateTime.getFullYear(), matchDateTime.getMonth(), matchDateTime.getDate());
      
      const timeString = matchDateTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      // Show date if not today
      if (matchDate.getTime() !== today.getTime()) {
        const dateString = matchDateTime.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric'
        });
        return timeStr ? `${dateString}, ${timeString}` : dateString;
      }
      
      return timeStr ? timeString : 'Today';
    } catch {
      return null;
    }
  };

  const playVideo = (videoId: string) => {
    setSelectedVideoId(videoId);
    setPlaying(false);
    setPlayerReady(false);
    setVideoModalVisible(true);
    
    // Show toast message
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(15000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowToast(false));
  };

  const closeVideo = () => {
    setPlaying(false);
    setVideoModalVisible(false);
    setSelectedVideoId(null);
    setPlayerReady(false);
  };

  const toggleLeague = (leagueId: number) => {
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

  const renderDatePicker = () => (
    <View style={styles.datePickerSection}>
      {/* Section Header */}
      <View style={styles.datePickerHeader}>
        <View style={styles.datePickerHeaderLeft}>
          <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
          <Text style={styles.datePickerHeaderText}>Select Date</Text>
        </View>
      </View>
      
      {/* Date Options */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.dateButtonsContainer}
        contentContainerStyle={styles.dateButtonsContent}
      >
        {/* Today Button */}
        <TouchableOpacity
          style={[
            styles.dateButton,
            !showComingSoon && selectedDate === getTodayString() && styles.dateButtonActive
          ]}
          onPress={() => {
            setShowComingSoon(false);
            setShowDatePicker(false);
            handleDateSelect(getTodayString());
            setCalendarDate(getTodayString());
          }}
        >
          <Text style={[
            styles.dateButtonText,
            !showComingSoon && selectedDate === getTodayString() && styles.dateButtonTextActive
          ]}>
            Today
          </Text>
        </TouchableOpacity>

        {/* Yesterday Button */}
        <TouchableOpacity
          style={[
            styles.dateButton,
            !showComingSoon && selectedDate === getYesterdayString() && styles.dateButtonActive
          ]}
          onPress={() => {
            setShowComingSoon(false);
            setShowDatePicker(false);
            handleDateSelect(getYesterdayString());
            setCalendarDate(getYesterdayString());
          }}
        >
          <Text style={[
            styles.dateButtonText,
            !showComingSoon && selectedDate === getYesterdayString() && styles.dateButtonTextActive
          ]}>
            Yesterday
          </Text>
        </TouchableOpacity>

        {/* Calendar Date Picker */}
        <TouchableOpacity
          style={[
            styles.dateButton,
            styles.calendarButton,
            !showComingSoon && selectedDate && selectedDate !== getTodayString() && selectedDate !== getYesterdayString() && styles.dateButtonActive
          ]}
          onPress={() => {
            setShowComingSoon(false);
            setShowDatePicker(!showDatePicker);
          }}
        >
          <Ionicons 
            name="calendar" 
            size={16} 
            color={!showComingSoon && selectedDate && selectedDate !== getTodayString() && selectedDate !== getYesterdayString() ? '#ffffff' : '#94a3b8'} 
          />
          <Text style={[
            styles.dateButtonText,
            !showComingSoon && selectedDate && selectedDate !== getTodayString() && selectedDate !== getYesterdayString() && styles.dateButtonTextActive
          ]}>
            {selectedDate && selectedDate !== getTodayString() && selectedDate !== getYesterdayString() ? formatDateLabel(selectedDate) : 'Calendar'}
          </Text>
        </TouchableOpacity>

        {/* Coming Soon Button */}
        <TouchableOpacity
          style={[
            styles.dateButton,
            styles.comingSoonButton,
            showComingSoon && styles.dateButtonActive
          ]}
          onPress={() => {
            console.log('Coming Soon button pressed, current state:', showComingSoon);
            setShowDatePicker(false);
            setShowComingSoon(!showComingSoon);
          }}
        >
          <Ionicons 
            name="time-outline" 
            size={16} 
            color={showComingSoon ? '#ffffff' : '#94a3b8'} 
          />
          <Text style={[
            styles.dateButtonText,
            showComingSoon && styles.dateButtonTextActive
          ]}>
            Coming Soon
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date(calendarDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          themeVariant="light"
          textColor="#ffffff"
          onChange={(event, selectedDate) => {
            if (selectedDate && event.type !== 'dismissed') {
              // Format date in local timezone to avoid UTC conversion issues
              const year = selectedDate.getFullYear();
              const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const day = String(selectedDate.getDate()).padStart(2, '0');
              const dateString = `${year}-${month}-${day}`;
              setCalendarDate(dateString);
              handleDateSelect(dateString);
              setShowDatePicker(false);
            } else if (event.type === 'dismissed') {
              setShowDatePicker(false);
            }
          }}
        />
      )}

      {/* Filter Info */}
      {selectedTeams.length > 0 && !showComingSoon && (
        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>
            Showing matches for: <Text style={styles.filterInfoHighlight}>{selectedTeams.length} team(s)</Text>
          </Text>
        </View>
      )}
      
      {/* No highlights warning */}
      {!showComingSoon && selectedDate && !availableDates.includes(selectedDate) && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={16} color="#f59e0b" />
          <Text style={styles.warningText}>No highlights found for this date</Text>
        </View>
      )}
    </View>
  );

  const renderComingSoon = () => (
    <ComingSoonMatches selectedTeams={selectedTeams} />
  );

  const renderHighlight = (highlight: Highlight, match: Match) => (
    <TouchableOpacity
      key={highlight.id}
      style={styles.highlightCard}
      onPress={() => playVideo(highlight.youtube_video_id)}
    >
      {highlight.is_geo_blocked && (
        <View style={styles.geoBlockWarning}>
          <Ionicons name="globe-outline" size={14} color="#f59e0b" />
          <Text style={styles.geoBlockText}>May not be available in some regions</Text>
        </View>
      )}
      <View style={styles.thumbnailContainer}>
        <YoutubePlayer
          height={Dimensions.get('window').width * (9 / 16)}
          width={Dimensions.get('window').width}
          play={false}
          videoId={highlight.youtube_video_id}
          webViewProps={{
            androidLayerType: 'hardware',
          }}
        />
      </View>
      <View style={styles.highlightInfo}>
        <Text style={styles.highlightTitle} numberOfLines={2}>
          {highlight.title}
        </Text>
        {highlight.channel_title && (
          <Text style={styles.channelTitle}>{highlight.channel_title}</Text>
        )}
        {(match.match_date || match.match_time) && (
          <View style={styles.matchTimeContainer}>
            <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
            <Text style={styles.matchTime}>
              {formatMatchDateTime(match.match_date, match.match_time)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMatch = (match: Match) => (
    <View key={match.id} style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <Text style={styles.matchTeams}>
          {match.home_team} vs {match.away_team}
        </Text>
      </View>
      <View style={styles.highlightsList}>
        {match.highlights.map((highlight) => renderHighlight(highlight, match))}
      </View>
    </View>
  );

  const renderLeagueSection = ({ item }: { item: HighlightsGroupedByLeague }) => {
    const isExpanded = expandedLeagueIds.has(item.league.id);
    const gradientColors = leagueColors[item.league.slug]?.colors || leagueColors['default'].colors;
    const hasStandings = LEAGUES_WITH_STANDINGS.includes(item.league.slug);
    const showStandings = showStandingsByLeague.has(item.league.id);
    const standings = leagueStandings[item.league.id];
    const isLoading = loadingStandingsByLeague.has(item.league.id);
    const showFullStandings = showFullStandingsByLeague.has(item.league.id);
    
    // Collect all highlights from all matches
    const allHighlights = item.matches.flatMap(match => match.highlights);
    
    return (
      <View style={styles.leagueSection}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.leagueHeaderGradient}
        >
          <TouchableOpacity
            style={styles.leagueHeaderContent}
            onPress={() => toggleLeague(item.league.id)}
            activeOpacity={0.8}
          >
            <View style={styles.leagueHeaderLeft}>
              <View style={styles.leagueIconCircle}>
                <Text style={styles.leagueIcon}>
                  {item.league.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.leagueInfo}>
                <Text style={styles.leagueName}>{item.league.name}</Text>
                <Text style={styles.leagueStats}>
                  {item.matches.length} match{item.matches.length !== 1 ? 'es' : ''} • {item.total_highlights} highlight{item.total_highlights !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.leagueHeaderRightActions}>
              {hasStandings && (
                <TouchableOpacity
                  style={styles.leagueActionButton}
                  onPress={() => handleStandingsToggle(item.league.id, item.league.slug)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="trending-up"
                    size={16}
                    color="#ffffff"
                  />
                  <Text style={styles.leagueActionButtonText}>
                    {showStandings ? 'Hide' : 'Standings'}
                  </Text>
                </TouchableOpacity>
              )}
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#ffffff"
              />
            </View>
          </TouchableOpacity>
        </LinearGradient>
        
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Standings Section */}
            {showStandings && standings && (
              <View style={styles.standingsContainer}>
                <View style={styles.standingsHeader}>
                  <Text style={styles.standingsTitle}>Standings • {standings.season}</Text>
                </View>
                <StandingsTable
                  standings={standings.standings}
                  loading={isLoading}
                  compact={!showFullStandings}
                  onToggleExpand={() => handleStandingsCompactToggle(item.league.id)}
                />
              </View>
            )}
            
            {/* Matches Section */}
            <View style={styles.matchesList}>
              {item.matches.map((match) => renderMatch(match))}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadHighlights(selectedDate || undefined)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controlsContainer}>
        <TeamSelector
          selectedTeams={selectedTeams}
          onTeamsChange={handleTeamsChange}
          onDone={handleTeamsDone}
        />
        {isAuthenticated && selectedTeams.length > 0 && (
          <TouchableOpacity
            style={styles.saveFavoritesButton}
            onPress={handleSaveFavorites}
            disabled={isSavingFavorites}
          >
            <Ionicons 
              name={isSavingFavorites ? "sync" : "bookmark"} 
              size={16} 
              color="white" 
            />
            <Text style={styles.saveFavoritesText}>
              {isSavingFavorites ? 'Saving...' : 'Save to Account'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {renderDatePicker()}
      
      {/* Coming Soon Section */}
      {showComingSoon && renderComingSoon()}
      
      {/* Highlights Section */}
      {!showComingSoon && (isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading highlights...</Text>
        </View>
      ) : highlightsData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="videocam-off" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>No highlights available</Text>
          <Text style={styles.emptySubtext}>
            {selectedDate 
              ? `No highlights found for ${formatDateLabel(selectedDate)}`
              : 'Select a date to view highlights'}
          </Text>
        </View>
      ) : (
        <>
          {/* Header with count */}
          <View style={styles.highlightsHeader}>
            <Text style={styles.highlightsHeaderTitle}>
              Highlights for {formatDateLabel(selectedDate || getYesterdayString())}
            </Text>
            <Text style={styles.highlightsHeaderCount}>
              {highlightsData.reduce((acc, league) => acc + league.total_highlights, 0)} videos
            </Text>
          </View>
          <FlatList
            data={highlightsData}
            renderItem={renderLeagueSection}
            keyExtractor={(item) => item.league.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
            }
          />
        </>
      ))}

      <Modal
        visible={videoModalVisible}
        animationType="slide"
        onRequestClose={closeVideo}
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeVideo} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#ffffff" />
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          {showToast && (
            <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
              <Ionicons name="information-circle" size={20} color="#ffffff" />
              <Text style={styles.toastText}>
                If video gets stuck on ad, close and try again
              </Text>
            </Animated.View>
          )}
          
          {selectedVideoId ? (
            <View style={styles.videoPlayerWrapper}>
              <YoutubePlayer
                height={Dimensions.get('window').width * (9 / 16)}
                width={Dimensions.get('window').width}
                play={true}
                videoId={selectedVideoId}
                onChangeState={(state) => {
                  console.log('Player state:', state);
                }}
                onReady={() => {
                  console.log('Player ready');
                }}
                onError={(error: string) => {
                  console.log('❌ Football highlight player error:', error);
                  console.log('Video ID:', selectedVideoId);
                  // Close modal and show error message
                  Alert.alert(
                    'Video Unavailable',
                    'This video is not available in your region or has been removed from YouTube. Please try another highlight.',
                    [
                      {
                        text: 'OK',
                        onPress: () => closeVideo(),
                      },
                    ]
                  );
                }}
                webViewProps={{
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserAction: false,
                }}
              />
            </View>
          ) : (
            <View style={styles.videoPlayerWrapper}>
              <Text style={{ color: 'white' }}>No video selected</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  controlsContainer: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  saveFavoritesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveFavoritesText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0f172a',
  },
  datePickerSection: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  datePickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  datePickerHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  dateButtonsContainer: {
    marginBottom: 0,
  },
  dateButtonsContent: {
    gap: 8,
    paddingVertical: 4,
  },
  dateButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarButton: {
    minWidth: 110,
  },
  comingSoonButton: {
    minWidth: 130,
  },
  dateButtonActive: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  dateButtonText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  dateButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filterInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  filterInfoText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  filterInfoHighlight: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningText: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '500',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  highlightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  highlightsHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  highlightsHeaderCount: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  leagueSection: {
    marginBottom: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  leagueHeaderGradient: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  leagueHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  leagueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  leagueIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  leagueIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  leagueInfo: {
    flex: 1,
  },
  leagueLogo: {
    width: 44,
    height: 44,
    marginRight: 14,
    borderRadius: 22,
  },
  leagueName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 3,
  },
  leagueStats: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  matchesList: {
    backgroundColor: '#1e293b',
  },
  matchCard: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  matchTeams: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  matchScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginLeft: 8,
  },
  highlightsList: {
    gap: 14,
  },
  highlightCard: {
    backgroundColor: '#334155',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  geoBlockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.3)',
  },
  geoBlockText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
  thumbnailContainer: {
    backgroundColor: '#000000',
    width: '100%',
    aspectRatio: 16 / 9,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  highlightInfo: {
    padding: 14,
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    lineHeight: 20,
  },
  channelTitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  matchTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  matchTime: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 17,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 16,
    color: '#ef4444',
    fontSize: 17,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 19,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 2000,
  },
  modalSafeArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1000,
  },
  closeButtonOverlay: {
    margin: 10,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  toastContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 1000,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  videoPlayerWrapper: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width * (9 / 16),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  videoWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  leagueHeaderRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leagueActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  leagueActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  expandedContent: {
    backgroundColor: '#1e293b',
  },
  standingsContainer: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  standingsHeader: {
    marginBottom: 12,
  },
  standingsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

