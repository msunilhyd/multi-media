'use client';

import { useState, useEffect } from 'react';
import { StandingsEntry } from '@/lib/api';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StandingsTableProps {
  standings: StandingsEntry[];
  compact?: boolean;
}

export default function StandingsTable({ standings, compact = false }: StandingsTableProps) {
  const getQualificationClass = (color: string | null) => {
    if (!color) return '';
    // Convert ESPN hex colors to Tailwind classes
    if (color.toLowerCase().includes('81d6ac') || color.toLowerCase().includes('green')) {
      return 'border-l-4 border-green-500';
    }
    if (color.toLowerCase().includes('blue') || color.toLowerCase().includes('81b7')) {
      return 'border-l-4 border-blue-500';
    }
    if (color.toLowerCase().includes('red') || color.toLowerCase().includes('ff')) {
      return 'border-l-4 border-red-500';
    }
    if (color.toLowerCase().includes('orange') || color.toLowerCase().includes('ffa')) {
      return 'border-l-4 border-orange-500';
    }
    return '';
  };

  const getFormIcon = (char: string) => {
    if (char === 'W') return <span className="text-green-500 font-bold">W</span>;
    if (char === 'L') return <span className="text-red-500 font-bold">L</span>;
    if (char === 'D') return <span className="text-gray-400 font-bold">D</span>;
    return <span className="text-gray-400 font-bold">{char}</span>;
  };

  if (compact) {
    // Compact view - show only top 6
    return (
      <div className="bg-gray-900/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800/50 text-gray-300 text-xs">
                <th className="py-2 px-3 text-left">#</th>
                <th className="py-2 px-3 text-left">Team</th>
                <th className="py-2 px-3 text-center font-bold">Pts</th>
                <th className="py-2 px-1.5 text-center">P</th>
                <th className="py-2 px-1.5 text-center">W</th>
                <th className="py-2 px-1.5 text-center">D</th>
                <th className="py-2 px-1.5 text-center">L</th>
                <th className="py-2 px-1.5 text-center">GD</th>
              </tr>
            </thead>
            <tbody>
              {standings.slice(0, 6).map((entry) => (
                <tr
                  key={entry.position}
                  className={`border-b border-gray-800 hover:bg-gray-800/30 transition-colors ${getQualificationClass(entry.qualification_color)}`}
                >
                  <td className="py-2 px-3 text-gray-400 font-medium">{entry.position}</td>
                  <td className="py-2 px-3 flex items-center gap-2">
                    {entry.logo && (
                      <img src={entry.logo} alt={entry.team} className="w-5 h-5 object-contain" />
                    )}
                    <span className="font-medium text-white truncate">{entry.team}</span>
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-white text-base">{entry.points}</td>
                  <td className="py-2 px-1.5 text-center text-gray-300">{entry.games_played}</td>
                  <td className="py-2 px-1.5 text-center text-gray-300">{entry.wins}</td>
                  <td className="py-2 px-1.5 text-center text-gray-300">{entry.draws}</td>
                  <td className="py-2 px-1.5 text-center text-gray-300">{entry.losses}</td>
                  <td className={`py-2 px-1.5 text-center font-medium ${entry.goal_difference > 0 ? 'text-green-500' : entry.goal_difference < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {entry.goal_difference > 0 ? '+' : ''}{entry.goal_difference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="flex justify-center py-4">
      <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-gray-800/80 text-gray-300 text-xs uppercase">
                <th className="py-1.5 px-0.5 text-center sticky left-0 bg-gray-800/80 z-10">#</th>
                <th className="py-1.5 px-0.5 text-left sticky left-4 bg-gray-800/80 z-10">Team</th>
                <th className="py-1.5 px-0 text-center font-bold">Pts</th>
                <th className="py-1.5 px-0 text-center">P</th>
                <th className="py-1.5 px-0 text-center">W</th>
                <th className="py-1.5 px-0 text-center">D</th>
                <th className="py-1.5 px-0 text-center">L</th>
                <th className="py-1.5 px-0 text-center">GF</th>
                <th className="py-1.5 px-0 text-center">GA</th>
                <th className="py-1.5 px-0 text-center">GD</th>
                <th className="py-1.5 px-0 text-center">Form</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((entry) => (
                <tr
                  key={entry.position}
                  className={`hover:bg-gray-800/40 transition-colors ${entry.position > 4 ? getQualificationClass(entry.qualification_color) : ''}`}
                >
                  <td className="py-1 px-0.5 text-gray-400 font-medium sticky left-0 bg-gray-950 text-center">{entry.position}</td>
                  <td className="py-1 px-0.5 sticky left-4 bg-gray-950">
                    <div className="flex items-center gap-0.5">
                      {entry.logo && (
                        <img src={entry.logo} alt={entry.team} className="w-3 h-3 object-contain flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-white text-xs truncate">{entry.team}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-1 px-0 text-center font-bold text-white">{entry.points}</td>
                  <td className="py-1 px-0 text-center text-gray-300">{entry.games_played}</td>
                  <td className="py-1 px-0 text-center text-gray-300">{entry.wins}</td>
                  <td className="py-1 px-0 text-center text-gray-300">{entry.draws}</td>
                  <td className="py-1 px-0 text-center text-gray-300">{entry.losses}</td>
                  <td className="py-1 px-0 text-center text-gray-300">{entry.goals_for}</td>
                  <td className="py-1 px-0 text-center text-gray-300">{entry.goals_against}</td>
                  <td className={`py-1 px-0 text-center font-medium text-xs ${entry.goal_difference > 0 ? 'text-green-500' : entry.goal_difference < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {entry.goal_difference > 0 ? '+' : ''}{entry.goal_difference}
                  </td>
                  <td className="py-1 px-0">
                    <div className="flex gap-0 justify-center">
                      {entry.form && entry.form.split('').slice(-5).map((char, i) => (
                        <div key={i} className="w-3 h-3 flex items-center justify-center text-xs">
                          {getFormIcon(char)}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Legend */}
        <div className="p-3 bg-gray-900/50 border-t border-gray-800">
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500"></div>
              <span>Champions League</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500"></div>
              <span>Europa League</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500"></div>
              <span>Conference League</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500"></div>
              <span>Relegation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
