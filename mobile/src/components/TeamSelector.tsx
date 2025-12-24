import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TeamsByLeague, fetchAllTeams } from '../services/api';

interface TeamSelectorProps {
  selectedTeams: string[];
  onTeamsChange: (teams: string[]) => void;
}

export default function TeamSelector({ selectedTeams, onTeamsChange }: TeamSelectorProps) {
  console.log('TeamSelector rendered');
  const [isOpen, setIsOpen] = useState(false);
  const [teamsByLeague, setTeamsByLeague] = useState<TeamsByLeague[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLeagues, setExpandedLeagues] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadTeams();
    }
  }, [isOpen]);

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

  const toggleTeam = async (teamName: string) => {
    const newTeams = selectedTeams.includes(teamName)
      ? selectedTeams.filter(t => t !== teamName)
      : [...selectedTeams, teamName];
    onTeamsChange(newTeams);
    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem('favoriteTeams', JSON.stringify(newTeams));
    } catch (e) {
      console.error('Failed to save teams:', e);
    }
  };

  const selectAllTeamsInLeague = async (leagueTeams: string[]) => {
    const newTeams = [...new Set([...selectedTeams, ...leagueTeams])];
    onTeamsChange(newTeams);
    try {
      await AsyncStorage.setItem('favoriteTeams', JSON.stringify(newTeams));
    } catch (e) {
      console.error('Failed to save teams:', e);
    }
  };

  const deselectAllTeamsInLeague = async (leagueTeams: string[]) => {
    const newTeams = selectedTeams.filter(t => !leagueTeams.includes(t));
    onTeamsChange(newTeams);
    try {
      await AsyncStorage.setItem('favoriteTeams', JSON.stringify(newTeams));
    } catch (e) {
      console.error('Failed to save teams:', e);
    }
  };

  const clearAllTeams = async () => {
    onTeamsChange([]);
    try {
      await AsyncStorage.setItem('favoriteTeams', JSON.stringify([]));
    } catch (e) {
      console.error('Failed to save teams:', e);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.openButton}
        onPress={() => setIsOpen(true)}
      >
        <Ionicons name="options" size={20} color="#fff" />
        <Text style={styles.openButtonText}>
          Filter Teams {selectedTeams.length > 0 && `(${selectedTeams.length})`}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Your Favorite Teams</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={styles.infoBar}>
              <Text style={styles.infoText}>
                {selectedTeams.length === 0
                  ? 'Select teams to filter highlights. Leave empty to see all matches.'
                  : `${selectedTeams.length} team${selectedTeams.length !== 1 ? 's' : ''} selected`}
              </Text>
            </View>

            {/* Teams List */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.loadingText}>Loading teams...</Text>
              </View>
            ) : (
              <FlatList
                data={teamsByLeague}
                keyExtractor={(item) => item.league_id.toString()}
                renderItem={({ item: league }) => {
                  const isExpanded = expandedLeagues.has(league.league_id);
                  const leagueTeamsSelected = league.teams.filter(t => selectedTeams.includes(t)).length;
                  
                  return (
                    <View style={styles.leagueContainer}>
                      {/* League Header */}
                      <TouchableOpacity
                        style={styles.leagueHeader}
                        onPress={() => toggleLeague(league.league_id)}
                      >
                        <Text style={styles.leagueName}>
                          {league.league_name}
                          {leagueTeamsSelected > 0 && (
                            <Text style={styles.selectedCount}> ({leagueTeamsSelected} selected)</Text>
                          )}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                          size={20}
                          color="#9ca3af"
                        />
                      </TouchableOpacity>

                      {/* Teams */}
                      {isExpanded && (
                        <View style={styles.teamsContainer}>
                          <View style={styles.bulkActions}>
                            <TouchableOpacity
                              style={styles.bulkButton}
                              onPress={() => selectAllTeamsInLeague(league.teams)}
                            >
                              <Text style={styles.bulkButtonText}>Select All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.bulkButton, styles.bulkButtonSecondary]}
                              onPress={() => deselectAllTeamsInLeague(league.teams)}
                            >
                              <Text style={styles.bulkButtonText}>Deselect All</Text>
                            </TouchableOpacity>
                          </View>
                          
                          <View style={styles.teamsGrid}>
                            {league.teams.map((team) => {
                              const isSelected = selectedTeams.includes(team);
                              return (
                                <TouchableOpacity
                                  key={team}
                                  style={[
                                    styles.teamButton,
                                    isSelected && styles.teamButtonSelected
                                  ]}
                                  onPress={() => toggleTeam(team)}
                                >
                                  <Text style={[
                                    styles.teamText,
                                    isSelected && styles.teamTextSelected
                                  ]}>
                                    {team}
                                  </Text>
                                  {isSelected && (
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearAllTeams}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setIsOpen(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoBar: {
    padding: 16,
    backgroundColor: '#374151',
  },
  infoText: {
    color: '#d1d5db',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  leagueContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  leagueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#374151',
  },
  leagueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  selectedCount: {
    fontSize: 14,
    color: '#60a5fa',
  },
  teamsContainer: {
    padding: 12,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  bulkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  bulkButtonSecondary: {
    backgroundColor: '#4b5563',
  },
  bulkButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  teamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#374151',
    borderRadius: 6,
    minWidth: '48%',
    maxWidth: '48%',
  },
  teamButtonSelected: {
    backgroundColor: '#3b82f6',
  },
  teamText: {
    color: '#d1d5db',
    fontSize: 13,
    flex: 1,
  },
  teamTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  clearButton: {
    padding: 12,
  },
  clearButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
