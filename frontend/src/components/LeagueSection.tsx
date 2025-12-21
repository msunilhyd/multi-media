'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { HighlightsGroupedByLeague } from '@/lib/api';
import VideoCard from './VideoCard';

interface LeagueSectionProps {
  leagueData: HighlightsGroupedByLeague;
  isExpanded: boolean;
  onToggle: () => void;
}

const leagueColors: Record<string, string> = {
  'premier-league': 'from-blue-700 to-blue-500',
  'champions-league': 'from-blue-800 to-blue-600',
  'europa-league': 'from-blue-600 to-blue-400',
  'la-liga': 'from-blue-700 to-blue-500',
  'serie-a': 'from-blue-700 to-blue-500',
  'bundesliga': 'from-blue-800 to-blue-600',
  'ligue-1': 'from-blue-900 to-blue-700',
  'fa-cup': 'from-blue-600 to-blue-400',
  'league-cup': 'from-blue-600 to-blue-400',
  'copa-del-rey': 'from-blue-700 to-blue-500',
  'coupe-de-france': 'from-blue-700 to-blue-500',
  'dfb-pokal': 'from-blue-800 to-blue-600',
  'coppa-italia': 'from-blue-700 to-blue-500',
  'default': 'from-blue-700 to-blue-500',
};

export default function LeagueSection({ leagueData, isExpanded, onToggle }: LeagueSectionProps) {
  const { league, matches, total_highlights } = leagueData;
  
  const gradientClass = leagueColors[league.slug] || leagueColors['default'];

  // Collect all highlights from all matches in this league
  const allHighlights = matches.flatMap(match => 
    match.highlights.map(highlight => ({
      ...highlight,
      matchInfo: `${match.home_team} vs ${match.away_team}`
    }))
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
      <button
        onClick={onToggle}
        className={`w-full bg-gradient-to-r ${gradientClass} text-white p-4 flex items-center justify-between hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold">{league.name.charAt(0)}</span>
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold">{league.name}</h2>
            <p className="text-white/80 text-sm">
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
      </button>
      
      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allHighlights.map((highlight) => (
              <VideoCard key={highlight.id} highlight={highlight} showMatchInfo={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
