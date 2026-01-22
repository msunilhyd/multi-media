import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen() {
  const { user, logout, refreshUser, deleteAccount } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data including:\n\n• Your profile\n• Saved favorites\n• Playlists\n• Notification preferences',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              Alert.alert('Success', 'Your account has been permanently deleted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSaveName = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      // TODO: Implement profile update API call
      setIsEditing(false);
      await refreshUser();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  if (!user) {
    return (
      <LinearGradient colors={['#1f2937', '#111827']} style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please login to view your profile</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1f2937', '#111827']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <LinearGradient
            colors={['#3b82f6', '#8b5cf6', '#ec4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>

          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter name"
                placeholderTextColor="#6b7280"
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditing(false);
                    setEditName(user.name);
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveName}
                  style={styles.saveButton}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb']}
                    style={styles.saveGradient}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{user.name}</Text>
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={20} color="#60a5fa" />
              </TouchableOpacity>
            </View>
          )}
          
          <Text style={styles.email}>{user.email}</Text>
          
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={16} color="#10b981" />
            <Text style={styles.badgeText}>Verified Account</Text>
          </View>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {new Date(user.created_at).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="key-outline" size={20} color="#9ca3af" />
              <Text style={styles.infoLabel}>Auth Provider</Text>
              <Text style={styles.infoValue}>
                {user.provider === 'email' ? 'Email' : 'Google'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#9ca3af" />
              <Text style={styles.infoLabel}>Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionContent}>
              <Ionicons name="notifications-outline" size={24} color="#60a5fa" />
              <Text style={styles.actionText}>Notification Preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionContent}>
              <Ionicons name="lock-closed-outline" size={24} color="#60a5fa" />
              <Text style={styles.actionText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionContent}>
              <Ionicons name="help-circle-outline" size={24} color="#60a5fa" />
              <Text style={styles.actionText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LinearGradient
            colors={['#dc2626', '#991b1b']}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out-outline" size={24} color="white" />
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteButton}>
          <View style={styles.deleteContent}>
            <Ionicons name="trash-outline" size={20} color="#dc2626" />
            <Text style={styles.deleteText}>Delete Account</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  email: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#065f46',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  editContainer: {
    width: '100%',
    alignItems: 'center',
  },
  editInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'white',
    fontSize: 18,
    width: '80%',
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    flex: 1,
    color: '#9ca3af',
    fontSize: 14,
  },
  infoValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#065f46',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#4b5563',
    marginVertical: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    color: 'white',
    fontSize: 16,
  },
  logoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 12,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  logoutText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 16,
    marginBottom: 30,
  },
  deleteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
});
