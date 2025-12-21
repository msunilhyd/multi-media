'use client';

import { Calendar } from 'lucide-react';
import { Match } from '@/lib/api';
import VideoCard from './VideoCard';

interface MatchCardProps {
  match: Match;
}

export default function MatchCard({ match }: MatchCardProps) {
  const { home_team, away_team, home_score, away_score, match_date, match_time, status, highlights } = match;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'finished':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">FT</span>;
      case 'live':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium animate-pulse">LIVE</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">{match_time || 'TBD'}</span>;
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-700 p-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(match_date)}</span>
            {match_time && <span>• {match_time}</span>}
          </div>
          {getStatusBadge()}
        </div>
        <div className="flex items-center justify-center gap-3">
          <span className="font-semibold text-gray-900 dark:text-white">{home_team}</span>
          <span className="text-gray-500 dark:text-gray-400 font-medium">vs</span>
          <span className="font-semibold text-gray-900 dark:text-white">{away_team}</span>
        </div>
      </div>
      
      {highlights.length > 0 && (
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Match Highlights ({highlights.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {highlights.map((highlight) => (
              <VideoCard key={highlight.id} highlight={highlight} />
            ))}
          </div>
        </div>
      )}
      
      {highlights.length === 0 && (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">No highlights available yet</p>
        </div>
      )}
    </div>
  );
}
