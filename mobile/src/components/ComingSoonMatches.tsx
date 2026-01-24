import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../services/api';

interface UpcomingMatch {
  home_team: string;
  away_team: string;
  match_date: string;
  match_time: string | null;
  league_name: string;
  home_score?: number | null;
  away_score?: number | null;
  status: string;
}

interface UpcomingMatchesByDate {
  date: string;
  date_label: string;
  matches: UpcomingMatch[];
}

interface Props {
  selectedTeams?: string[];
}

const leagueColors: Record<string, string> = {
  'Premier League': '#9333ea', // purple-600
  'La Liga': '#f97316', // orange-500
  'Bundesliga': '#dc2626', // red-600
  'Serie A': '#2563eb', // blue-600
  'Ligue 1': '#16a34a', // green-600
  'Champions League': '#1e40af', // blue-800
  'Europa League': '#d97706', // amber-500
  'FA Cup': '#ef4444', // red-500
  'League Cup': '#22c55e', // green-500
  'Copa del Rey': '#ca8a04', // yellow-600
  'Supercopa de España': '#eab308', // yellow-500
  'DFB-Pokal': '#b91c1c', // red-700
  'Coppa Italia': '#3b82f6', // blue-500
};

export default function ComingSoonMatches({ selectedTeams = [] }: Props) {
  const [upcomingData, setUpcomingData] = useState<UpcomingMatchesByDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcomingMatches = async () => {
    try {
      setError(null);
      let url = `${API_BASE_URL}/api/matches/upcoming?days=7`;
      
      if (selectedTeams.length > 0) {
        const teamParam = selectedTeams.join(',');
        url += `&teams=${encodeURIComponent(teamParam)}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch upcoming matches');
      
      const data = await response.json();
      setUpcomingData(data);
    } catch (err) {
      console.error('Error fetching upcoming matches:', err);
      setError('Failed to load upcoming matches');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUpcomingMatches();
  }, [selectedTeams]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUpcomingMatches();
  };

  const formatMatchTime = (utcTime: string | null, matchDate: string): string => {
    if (!utcTime) return '';
    try {
      const [hours, minutes] = utcTime.split(':').map(Number);
      const utcDate = new Date(matchDate);
      utcDate.setUTCHours(hours, minutes, 0, 0);
      
      return utcDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return utcTime;
    }
  };

  const getDateDisplay = (dateStr: string) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const [year, month, day] = dateStr.split('-').map(Number);
    const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);
    
    const matchDate = new Date(year, month - 1, day, 12, 0, 0);
    const today = new Date(todayYear, todayMonth - 1, todayDay, 12, 0, 0);
    
    const diffDays = Math.round((matchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return { emoji: '🔥', label: 'Today', color: '#fbbf24' };
    } else if (diffDays === 1) {
      return { emoji: '⭐', label: 'Tomorrow', color: '#fbbf24' };
    } else {
      const dayName = matchDate.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { emoji: '📅', label: `${dayName}, ${monthDay}`, color: '#fbbf24' };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="timer-outline" size={20} color="#fbbf24" />
          <Text style={styles.title}>Coming Soon</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </View>
    );
  }

  if (error || upcomingData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="timer-outline" size={20} color="#fbbf24" />
          <Text style={styles.title}>Coming Soon</Text>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-outline" size={48} color="#6b7280" />
          <Text style={styles.emptyText}>No upcoming matches</Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={upcomingData}
      keyExtractor={(item) => item.date}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          tintColor="#8b5cf6" 
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Ionicons name="timer-outline" size={20} color="#fbbf24" />
          <Text style={styles.title}>Coming Soon</Text>
          <Text style={styles.subtitle}>This Week</Text>
        </View>
      }
      renderItem={({ item }) => {
        const dateDisplay = getDateDisplay(item.date);
        return (
          <View style={styles.dayContainer}>
            <View style={styles.dateHeader}>
              <View 
                style={[
                  styles.dateBadge, 
                  { borderColor: dateDisplay.color }
                ]}
              >
                <Text style={styles.dateEmoji}>{dateDisplay.emoji}</Text>
                <Text style={styles.dateLabel}>{dateDisplay.label}</Text>
              </View>
              <Text style={styles.matchCount}>
                {item.matches.length} {item.matches.length === 1 ? 'match' : 'matches'}
              </Text>
            </View>
            
            <View style={styles.matchesList}>
              {item.matches.map((match, idx) => {
                const leagueName = match.league_name || 'Unknown League';
                const leagueColor = leagueColors[leagueName] || '#6b7280';
                const uniqueKey = `${item.date}-${leagueName}-${match.home_team}-${match.away_team}-${idx}`;
                return (
                  <View key={uniqueKey} style={styles.matchCard}>
                    <View 
                      style={[
                        styles.leagueIndicator,
                        { backgroundColor: leagueColor }
                      ]} 
                    />
                    <View style={styles.matchContent}>
                      <Text style={styles.leagueNameSmall}>{leagueName}</Text>
                      <Text style={styles.matchTeams}>
                        {match.home_team} vs {match.away_team}
                      </Text>
                      {match.match_time && (
                        <View style={styles.timeContainer}>
                          <Ionicons name="time-outline" size={12} color="#9ca3af" />
                          <Text style={styles.matchTimeText}>
                            {formatMatchTime(match.match_time, match.match_date)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      }}
      scrollEnabled={true}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 'auto',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
  },
  dayContainer: {
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  dateEmoji: {
    fontSize: 14,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  matchCount: {
    fontSize: 12,
    color: '#9ca3af',
    backgroundColor: '#1f2937',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  matchesList: {
    gap: 10,
  },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  leagueIndicator: {
    width: 4,
    borderRadius: 2,
  },
  matchContent: {
    flex: 1,
  },
  leagueNameSmall: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
  matchTeams: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchTimeText: {
    fontSize: 11,
    color: '#9ca3af',
  },
});
