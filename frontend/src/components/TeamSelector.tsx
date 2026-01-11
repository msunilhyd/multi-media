'use client';

import { useState, useEffect } from 'react';
import { X, Check, Settings } from 'lucide-react';
import { TeamsByLeague, fetchAllTeams } from '@/lib/api';

interface TeamSelectorProps {
  selectedTeams: string[];
  onTeamsChange: (teams: string[]) => void;
  onDone?: () => void;
}

export default function TeamSelector({ selectedTeams, onTeamsChange, onDone }: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [teamsByLeague, setTeamsByLeague] = useState<TeamsByLeague[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLeagues, setExpandedLeagues] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      const teams = await fetchAllTeams();
      setTeamsByLeague(teams);
      // Expand first league by default
      if (teams.length > 0) {
        setExpandedLeagues(new Set([teams[0].league_id]));
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLeague = (leagueId: number) => {
    const newExpanded = new Set(expandedLeagues);
    if (newExpanded.has(leagueId)) {
      newExpanded.delete(leagueId);
    } else {
      newExpanded.add(leagueId);
    }
    setExpandedLeagues(newExpanded);
  };

  const toggleTeam = (teamName: string) => {
    const newTeams = selectedTeams.includes(teamName)
      ? selectedTeams.filter(t => t !== teamName)
      : [...selectedTeams, teamName];
    onTeamsChange(newTeams);
  };

  const selectAllTeamsInLeague = (leagueTeams: string[]) => {
    const newTeams = Array.from(new Set([...selectedTeams, ...leagueTeams]));
    onTeamsChange(newTeams);
  };

  const deselectAllTeamsInLeague = (leagueTeams: string[]) => {
    const newTeams = selectedTeams.filter(t => !leagueTeams.includes(t));
    onTeamsChange(newTeams);
  };

  const clearAllTeams = () => {
    onTeamsChange([]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        <Settings size={20} />
        <span>Filter Teams {selectedTeams.length > 0 && `(${selectedTeams.length})`}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Select Your Favorite Teams</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Info */}
        <div className="p-4 bg-gray-800 text-sm text-gray-300">
          {selectedTeams.length === 0 ? (
            <p>Select teams to filter highlights. Leave empty to see all matches.</p>
          ) : (
            <p>{selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected</p>
          )}
        </div>

        {/* Teams List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Loading teams...</div>
          ) : (
            <div className="space-y-4">
              {teamsByLeague.map((league) => {
                const isExpanded = expandedLeagues.has(league.league_id);
                const leagueTeamsSelected = league.teams.filter(t => selectedTeams.includes(t)).length;
                
                return (
                  <div key={league.league_id} className="border border-gray-800 rounded-lg overflow-hidden">
                    {/* League Header */}
                    <button
                      onClick={() => toggleLeague(league.league_id)}
                      className="w-full p-3 bg-gray-800 hover:bg-gray-750 flex justify-between items-center transition-colors"
                    >
                      <span className="font-semibold text-white">
                        {league.league_name}
                        {leagueTeamsSelected > 0 && (
                          <span className="ml-2 text-sm text-blue-400">({leagueTeamsSelected} selected)</span>
                        )}
                      </span>
                      <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                    </button>

                    {/* Teams */}
                    {isExpanded && (
                      <div className="p-3 space-y-2">
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => selectAllTeamsInLeague(league.teams)}
                            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => deselectAllTeamsInLeague(league.teams)}
                            className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                          >
                            Deselect All
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {league.teams.map((team) => {
                            const isSelected = selectedTeams.includes(team);
                            return (
                              <button
                                key={team}
                                onClick={() => toggleTeam(team)}
                                className={`p-2 rounded text-left flex items-center justify-between transition-colors ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                              >
                                <span className="text-sm">{team}</span>
                                {isSelected && <Check size={16} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex justify-between items-center">
          <button
            onClick={clearAllTeams}
            className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onDone?.();
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
