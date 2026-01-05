'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';
import { HighlightsGroupedByLeague } from '@/lib/api';
import VideoCard from './VideoCard';
import PlayAllModal from './PlayAllModal';

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
  'afcon': 'from-green-700 to-green-500',
  'default': 'from-blue-700 to-blue-500',
};

export default function LeagueSection({ leagueData, isExpanded, onToggle }: LeagueSectionProps) {
  const [isPlayAllOpen, setIsPlayAllOpen] = useState(false);
  const { league, matches, total_highlights } = leagueData;
  
  const gradientClass = leagueColors[league.slug] || leagueColors['default'];

  // Collect all highlights from all matches in this league
  const allHighlights = matches.flatMap(match => 
    match.highlights.map(highlight => ({
      ...highlight,
      matchInfo: `${match.home_team} vs ${match.away_team}`
    }))
  );

  const handlePlayAll = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling the section
    setIsPlayAllOpen(true);
  };

  return (
    <>
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
                {matches.length} match{matches.length !== 1 ? 'es' : ''} • {total_highlights} highlight{total_highlights !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {total_highlights > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Play all highlights"
              >
                <PlayCircle className="w-5 h-5" />
                <span className="font-medium">Play All</span>
              </button>
            )}
            {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </div>
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

      <PlayAllModal
        highlights={allHighlights}
        isOpen={isPlayAllOpen}
        onClose={() => setIsPlayAllOpen(false)}
        leagueName={league.name}
      />
    </>
  );
}
