'use client';

import { useState, useEffect } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { UpcomingMatchesByDate, fetchUpcomingMatches } from '@/lib/api';

// League colors for visual distinction
const leagueColors: Record<string, string> = {
  'Premier League': 'bg-purple-600',
  'La Liga': 'bg-orange-500',
  'Bundesliga': 'bg-red-600',
  'Serie A': 'bg-blue-600',
  'Ligue 1': 'bg-green-600',
  'Champions League': 'bg-blue-800',
  'Europa League': 'bg-amber-500',
  'FA Cup': 'bg-red-500',
  'League Cup': 'bg-green-500',
  'Copa del Rey': 'bg-yellow-600',
  'Supercopa de España': 'bg-yellow-500',
  'DFB-Pokal': 'bg-red-700',
  'Coppa Italia': 'bg-blue-500',
};

// Convert UTC time (HH:MM) to local timezone in 12-hour format
function formatMatchTime(utcTime: string | null, matchDate: string): string {
  if (!utcTime) return '';
  
  try {
    // Parse the UTC time and date
    const [hours, minutes] = utcTime.split(':').map(Number);
    const utcDate = new Date(matchDate);
    utcDate.setUTCHours(hours, minutes, 0, 0);
    
    // Format in user's local timezone with 12-hour format
    return utcDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  } catch {
    return utcTime; // Fallback to original if parsing fails
  }
}

// Get styled date label with special treatment for Today/Tomorrow
function getDateDisplay(dateLabel: string, dateStr: string): { label: string; badgeClass: string; textClass: string } {
  // Get today's date in local timezone (year, month, day only)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Parse the match date string (YYYY-MM-DD format)
  const [year, month, day] = dateStr.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);
  
  // Create dates at noon to avoid timezone issues
  const matchDate = new Date(year, month - 1, day, 12, 0, 0);
  const today = new Date(todayYear, todayMonth - 1, todayDay, 12, 0, 0);
  
  const diffDays = Math.round((matchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return {
      label: '🔥 Today',
      badgeClass: 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/30',
      textClass: 'text-white font-bold'
    };
  } else if (diffDays === 1) {
    return {
      label: '⭐ Tomorrow',
      badgeClass: 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/30',
      textClass: 'text-white font-bold'
    };
  } else if (diffDays === 2) {
    // Day after tomorrow - same color as tomorrow
    const dayName = matchDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      label: `📅 ${dayName}, ${monthDay}`,
      badgeClass: 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/30',
      textClass: 'text-white font-bold'
    };
  } else if (diffDays === 3) {
    // 3 days out - same color as tomorrow
    const dayName = matchDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      label: `🗓️ ${dayName}, ${monthDay}`,
      badgeClass: 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/30',
      textClass: 'text-white font-bold'
    };
  } else if (diffDays === 4) {
    // 4 days out - same color as tomorrow
    const dayName = matchDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      label: `✨ ${dayName}, ${monthDay}`,
      badgeClass: 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/30',
      textClass: 'text-white font-bold'
    };
  } else if (diffDays === 5) {
    // 5 days out - same color as tomorrow
    const dayName = matchDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      label: `🌟 ${dayName}, ${monthDay}`,
      badgeClass: 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/30',
      textClass: 'text-white font-bold'
    };
  } else if (diffDays === 6) {
    // 6 days out - same color as tomorrow
    const dayName = matchDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      label: `💫 ${dayName}, ${monthDay}`,
      badgeClass: 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/30',
      textClass: 'text-white font-bold'
    };
  } else {
    // 7+ days out - same color as tomorrow
    const dayName = matchDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      label: `🎯 ${dayName}, ${monthDay}`,
      badgeClass: 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/30',
      textClass: 'text-white font-bold'
    };
  }
}

export default function ComingSoon({ selectedTeams = [] }: { selectedTeams?: string[] }) {
  const [upcomingData, setUpcomingData] = useState<UpcomingMatchesByDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUpcoming = async () => {
      try {
        setIsLoading(true);
        const data = await fetchUpcomingMatches(7, selectedTeams.length > 0 ? selectedTeams : undefined);
        setUpcomingData(data);
      } catch (err) {
        setError('Failed to load upcoming matches');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUpcoming();
  }, [selectedTeams]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-bold text-white">Coming Soon</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      </div>
    );
  }

  if (error || upcomingData.length === 0) {
    return null; // Don't show section if no upcoming matches
  }

  return (
    <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-lg shadow-lg p-6 mb-6 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-bold text-white">Coming Soon</h3>
          <span className="text-xs text-indigo-300 ml-2">This Week</span>
        </div>

        <div className="space-y-4">
          {upcomingData.map((dayData) => {
            const dateDisplay = getDateDisplay(dayData.date_label, dayData.date);
            return (
            <div key={dayData.date}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm ${dateDisplay.badgeClass} ${dateDisplay.textClass}`}>
                  {dateDisplay.label}
                </span>
                <span className="text-xs text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded-full">
                  {dayData.matches.length} {dayData.matches.length === 1 ? 'match' : 'matches'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dayData.matches.map((match, idx) => (
                  <div 
                    key={`${match.home_team}-${match.away_team}-${idx}`}
                    className="bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/15 transition-colors"
                  >
                    {/* League badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${leagueColors[match.league_name] || 'bg-gray-500'}`} />
                      <span className="text-xs text-indigo-300 truncate">{match.league_name}</span>
                      {match.status === 'live' && (
                        <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                          LIVE
                        </span>
                      )}
                    </div>
                    
                    {/* Teams */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">
                          {match.home_team} <span className="text-indigo-300">vs</span> {match.away_team}
                        </p>
                      </div>
                      
                      {/* Time display */}
                      <div className="text-right ml-2">
                        {match.match_time && (
                          <p className="text-yellow-400 font-mono text-xs">{formatMatchTime(match.match_time, match.match_date)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
}
