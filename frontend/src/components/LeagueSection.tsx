'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, PlayCircle, TrendingUp } from 'lucide-react';
import { HighlightsGroupedByLeague, fetchStandings, Standings } from '@/lib/api';
import VideoCard from './VideoCard';
import PlayAllModal from './PlayAllModal';
import StandingsTable from './StandingsTable';

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

// Leagues that have standings available
const LEAGUES_WITH_STANDINGS = ['premier-league', 'la-liga', 'serie-a', 'bundesliga', 'ligue-1', 'super-league', 'champions-league', 'europa-league'];

export default function LeagueSection({ leagueData, isExpanded, onToggle }: LeagueSectionProps) {
  const [isPlayAllOpen, setIsPlayAllOpen] = useState(false);
  const [standings, setStandings] = useState<Standings | null>(null);
  const [showStandings, setShowStandings] = useState(false);
  const [showFullStandings, setShowFullStandings] = useState(false);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const { league, matches, total_highlights } = leagueData;
  
  const gradientClass = leagueColors[league.slug] || leagueColors['default'];
  const hasStandings = LEAGUES_WITH_STANDINGS.includes(league.slug);

  // Load standings when button is clicked
  const handleStandingsToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling the section
    
    if (!showStandings && !standings && !loadingStandings) {
      setLoadingStandings(true);
      try {
        const data = await fetchStandings(league.slug);
        setStandings(data);
      } catch (err) {
        console.error('Failed to fetch standings:', err);
      } finally {
        setLoadingStandings(false);
      }
    }
    
    const nextShow = !showStandings;
    setShowStandings(nextShow);
    if (!nextShow) {
      setShowFullStandings(false); // reset when closing
    }
  };

  // Collect all highlights from all matches in this league
  const allHighlights = matches.flatMap(match => 
    match.highlights.map(highlight => ({
      ...highlight,
      matchInfo: `${match.home_team} vs ${match.away_team}`,
      matchDate: match.match_date,
      matchTime: match.match_time
    }))
  );

  const handlePlayAll = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling the section
    setIsPlayAllOpen(true);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
        <div
          onClick={onToggle}
          className={`w-full bg-gradient-to-r ${gradientClass} text-white p-4 flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer`}
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
            {hasStandings && (
              <button
                onClick={handleStandingsToggle}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title={showStandings ? "Hide standings" : "Show standings"}
              >
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">{showStandings ? 'Hide Table' : 'Standings'}</span>
              </button>
            )}
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
        </div>
        
        {isExpanded && (
          <div className="p-4 space-y-6">
            {/* Standings Section */}
            {showStandings && (
              <div className="mb-6">
                {loadingStandings ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : standings ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Standings</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">• {standings.season}</span>
                      </div>
                      <button
                        onClick={() => setShowFullStandings(prev => !prev)}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {showFullStandings ? 'Show Top 6' : 'Show All'}
                      </button>
                    </div>
                    <StandingsTable standings={standings.standings} compact={!showFullStandings} />
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Failed to load standings
                  </div>
                )}
              </div>
            )}

            {/* Highlights Section */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Highlights
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allHighlights.map((highlight) => (
                  <VideoCard key={highlight.id} highlight={highlight} showMatchInfo={true} />
                ))}
              </div>
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
