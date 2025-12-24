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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAllHighlightsGrouped, fetchAvailableDates, fetchHighlightsGroupedByDate, fetchHighlightsGroupedWithTeamFilter, HighlightsGroupedByLeague, Match, Highlight } from '../services/api';
import TeamSelector from '../components/TeamSelector';

export default function FootballScreen() {
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
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const loadFavoriteTeams = async () => {
    try {
      const saved = await AsyncStorage.getItem('favoriteTeams');
      if (saved) {
        const teams = JSON.parse(saved);
        console.log('Loaded favorite teams:', teams);
        setSelectedTeams(teams);
        return teams;
      }
      return [];
    } catch (e) {
      console.error('Failed to load saved teams:', e);
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
      
      console.log('Loading highlights with teams:', teams, 'and date:', date);
      const data = teams.length > 0
        ? await fetchHighlightsGroupedWithTeamFilter(teams, date)
        : date 
          ? await fetchHighlightsGroupedByDate(date)
          : await fetchAllHighlightsGrouped();
      
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
    await loadHighlights(selectedDate || undefined);
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

  useEffect(() => {
    const initializePage = async () => {
      // Load favorite teams first
      const teams = await loadFavoriteTeams();
      console.log('Teams loaded before highlights:', teams);
      
      const allDates = await fetchAvailableDates();
      
      // Filter out future dates - only show today and past dates
      const today = new Date().toISOString().split('T')[0];
      const filteredDates = allDates.filter(date => date <= today);
      
      setAvailableDates(filteredDates);
      
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      let defaultDate = yesterday;
      
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
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.datePickerContainer}
    >
      {selectedTeams.length === 0 && (
        <TouchableOpacity
          style={[styles.dateButton, !selectedDate && styles.dateButtonActive]}
          onPress={handleShowAll}
        >
          <Text style={[styles.dateButtonText, !selectedDate && styles.dateButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      )}
      {availableDates.map((date) => (
        <TouchableOpacity
          key={date}
          style={[styles.dateButton, selectedDate === date && styles.dateButtonActive]}
          onPress={() => handleDateSelect(date)}
        >
          <Text style={[styles.dateButtonText, selectedDate === date && styles.dateButtonTextActive]}>
            {formatDateLabel(date)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderHighlight = (highlight: Highlight, match: Match) => (
    <TouchableOpacity
      key={highlight.id}
      style={styles.highlightCard}
      onPress={() => playVideo(highlight.youtube_video_id)}
    >
      <View style={styles.thumbnailContainer}>
        <YoutubePlayer
          height={200}
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
    
    return (
      <View style={styles.leagueSection}>
        <TouchableOpacity
          style={styles.leagueHeader}
          onPress={() => toggleLeague(item.league.id)}
        >
          <View style={styles.leagueHeaderLeft}>
            {item.league.logo_url && (
              <Image
                source={{ uri: item.league.logo_url }}
                style={styles.leagueLogo}
              />
            )}
            <View>
              <Text style={styles.leagueName}>{item.league.name}</Text>
              <Text style={styles.leagueStats}>
                {item.matches.length} matches
              </Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#9ca3af"
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.matchesList}>
            {item.matches.map((match) => renderMatch(match))}
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
        />
      </View>
      {renderDatePicker()}
      
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading highlights...</Text>
        </View>
      ) : highlightsData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="videocam-off" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>No highlights available</Text>
        </View>
      ) : (
        <FlatList
          data={highlightsData}
          renderItem={renderLeagueSection}
          keyExtractor={(item) => item.league.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
        />
      )}

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
    backgroundColor: '#111827',
  },
  controlsContainer: {
    backgroundColor: '#1f2937',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerContainer: {
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#374151',
  },
  dateButtonActive: {
    backgroundColor: '#3b82f6',
  },
  dateButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  dateButtonTextActive: {
    color: '#ffffff',
  },
  leagueSection: {
    marginBottom: 12,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  leagueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  leagueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  leagueLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
  },
  leagueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  leagueStats: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  matchesList: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  matchCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchTeams: {
    fontSize: 16,
    fontWeight: '600',
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
    gap: 12,
  },
  highlightCard: {
    backgroundColor: '#374151',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
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
    padding: 12,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  channelTitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  loadingText: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
    padding: 12,
    backgroundColor: '#374151',
    borderRadius: 8,
    gap: 8,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  toastContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  videoPlayerWrapper: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width * (9 / 16),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
