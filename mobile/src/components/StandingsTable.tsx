import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandingsEntry } from '../services/api';

interface StandingsTableProps {
  standings: StandingsEntry[];
  loading?: boolean;
  compact?: boolean;
  onToggleExpand?: (compact: boolean) => void;
}

export default function StandingsTable({
  standings,
  loading = false,
  compact = true,
  onToggleExpand,
}: StandingsTableProps) {
  const entriesToShow = compact ? standings.slice(0, 6) : standings;
  const tableColumns = compact
    ? ['#', 'Team', 'Pts', 'P', 'W', 'D', 'L', 'GD']
    : ['#', 'Team', 'Pts', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading standings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tableWrapper}
      >
        <View>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            {tableColumns.map((col) => (
              <View
                key={col}
                style={[
                  styles.headerCell,
                  col === 'Team' && styles.teamCell,
                  col === 'Pts' && styles.ptsCell,
                ]}
              >
                <Text style={styles.headerText}>{col}</Text>
              </View>
            ))}
          </View>

          {/* Table Rows */}
          {entriesToShow.map((entry, index) => (
            <View
              key={entry.position}
              style={[
                styles.tableRow,
                index % 2 === 0 && styles.alternateRow,
              ]}
            >
              <View style={[styles.cell, styles.positionCell]}>
                <Text style={styles.cellText}>{entry.position}</Text>
              </View>
              <View style={[styles.cell, styles.teamCell]}>
                <View style={styles.teamContent}>
                  {entry.logo && (
                    <View style={styles.logoContainer}>
                      <Text style={styles.logo}>⚽</Text>
                    </View>
                  )}
                  <Text style={styles.teamName} numberOfLines={1}>
                    {entry.team}
                  </Text>
                </View>
              </View>
              <View style={[styles.cell, styles.ptsCell]}>
                <Text style={styles.ptsText}>{entry.points}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellText}>{entry.games_played}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellText}>{entry.wins}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellText}>{entry.draws}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.cellText}>{entry.losses}</Text>
              </View>
              {!compact && (
                <>
                  <View style={styles.cell}>
                    <Text style={styles.cellText}>{entry.goals_for}</Text>
                  </View>
                  <View style={styles.cell}>
                    <Text style={styles.cellText}>{entry.goals_against}</Text>
                  </View>
                </>
              )}
              <View style={styles.cell}>
                <Text
                  style={[
                    styles.cellText,
                    entry.goal_difference > 0 && styles.positive,
                    entry.goal_difference < 0 && styles.negative,
                  ]}
                >
                  {entry.goal_difference > 0 ? '+' : ''}
                  {entry.goal_difference}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Toggle Button */}
      {onToggleExpand && (
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => onToggleExpand(!compact)}
        >
          <Ionicons
            name={compact ? 'expand' : 'contract'}
            size={16}
            color="#3b82f6"
          />
          <Text style={styles.toggleText}>
            {compact ? 'Show All' : 'Show Top 6'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  tableWrapper: {
    marginHorizontal: 0,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    backgroundColor: '#111827',
  },
  alternateRow: {
    backgroundColor: '#1a202c',
  },
  headerCell: {
    width: 50,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cell: {
    width: 50,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionCell: {
    width: 40,
  },
  teamCell: {
    width: 140,
    alignItems: 'flex-start',
    paddingHorizontal: 12,
  },
  ptsCell: {
    width: 55,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 12,
    color: '#e5e7eb',
    fontWeight: '500',
  },
  ptsText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  teamContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 24,
    height: 24,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 12,
  },
  teamName: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#ef4444',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  toggleText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
