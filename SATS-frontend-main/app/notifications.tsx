import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { notificationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type?: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  isRead: boolean;
  isAcknowledged?: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: { name?: string; email?: string } | string;
  resolvedAt?: string;
  resolvedBy?: { name?: string; email?: string } | string;
  resolutionNotes?: string;
  createdAt: string;
}

interface NotificationStats {
  total: number;
  active: number;
  resolved: number;
  dismissed: number;
  critical: number;
  unread: number;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'RESOLVED'>('ACTIVE');
  
  // Resolve modal state
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const params: any = { limit: 50 };
      if (activeFilter === 'ACTIVE') {
        params.status = 'ACTIVE';
      } else if (activeFilter === 'RESOLVED') {
        params.status = 'RESOLVED';
      } else if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(activeFilter)) {
        params.priority = activeFilter;
      }

      const [listRes, statsRes] = await Promise.all([
        notificationsAPI.getAll(params),
        notificationsAPI.getStats(),
      ]);

      if (listRes && Array.isArray(listRes.notifications)) {
        setNotifications(listRes.notifications);
      } else if (Array.isArray(listRes)) {
        setNotifications(listRes);
      }

      if (statsRes && statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    setLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleAcknowledge = async (item: NotificationItem) => {
    try {
      await notificationsAPI.acknowledge(item._id);
      Alert.alert('Alert Acknowledged', 'The security/movement alert has been successfully acknowledged.');
      fetchNotifications();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to acknowledge alert.');
    }
  };

  const handleSimulateAlert = () => {
    Alert.alert(
      'Simulate Movement Alert',
      'Generate a test unauthorized movement alert for Asset AST-001 (moved outside geofence perimeter)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate Alert',
          onPress: async () => {
            try {
              await notificationsAPI.simulateMovementAlert({
                assetTag: 'AST-001',
                assetName: 'Dell UltraSharp Monitor',
                locationName: 'Unknown Area (Outside Campus Geofence)',
                severity: 'HIGH',
              });
              Alert.alert('Alert Created', 'Unauthorized movement alert for AST-001 has been logged.');
              fetchNotifications();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to simulate alert.');
            }
          },
        },
      ]
    );
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      if (stats) setStats({ ...stats, unread: 0 });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to mark notifications as read.');
    }
  };

  const handleItemPress = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await notificationsAPI.markRead(item._id);
        setNotifications(prev =>
          prev.map(n => (n._id === item._id ? { ...n, isRead: true } : n))
        );
        if (stats && stats.unread > 0) {
          setStats({ ...stats, unread: stats.unread - 1 });
        }
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    }
  };

  const handleOpenResolve = (item: NotificationItem) => {
    setSelectedNotification(item);
    setResolutionNotes('');
    setResolveModalVisible(true);
  };

  const handleConfirmResolve = async () => {
    if (!selectedNotification) return;
    try {
      setSubmittingAction(true);
      await notificationsAPI.resolve(selectedNotification._id, resolutionNotes);
      setResolveModalVisible(false);
      setSelectedNotification(null);
      setResolutionNotes('');
      fetchNotifications();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to resolve alert.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDismiss = (item: NotificationItem) => {
    Alert.alert(
      'Dismiss Alert',
      'Are you sure you want to dismiss this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationsAPI.dismiss(item._id);
              fetchNotifications();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to dismiss alert.');
            }
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return '#d32f2f';
      case 'HIGH':
        return '#f57c00';
      case 'MEDIUM':
        return '#0288d1';
      default:
        return '#757575';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MAINTENANCE':
        return 'construct-outline';
      case 'ASSET_STATUS':
      case 'ASSET_MOVEMENT':
        return 'swap-horizontal-outline';
      case 'SECURITY':
      case 'GEOFENCE':
        return 'shield-alert-outline';
      default:
        return 'notifications-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Notifications</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={styles.testAlertBtn}
            onPress={handleSimulateAlert}
          >
            <Ionicons name="shield-outline" size={18} color="#dc2626" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllRead}
            disabled={!stats || stats.unread === 0}
          >
            <Ionicons
              name="checkmark-done"
              size={20}
              color={stats && stats.unread > 0 ? '#007AFF' : '#9ca3af'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Stats Bar */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#007AFF' }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#d32f2f' }]}>{stats.critical}</Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#2e7d32' }]}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['ACTIVE', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'RESOLVED', 'ALL'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {filter === 'ALL'
                    ? 'All Alerts'
                    : filter === 'ACTIVE'
                    ? 'Active'
                    : filter === 'CRITICAL'
                    ? 'Critical'
                    : filter === 'HIGH'
                    ? 'High'
                    : filter === 'MEDIUM'
                    ? 'Medium'
                    : filter === 'LOW'
                    ? 'Low'
                    : 'Resolved'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={54} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySubtitle}>
                There are no alerts matching the selected filter.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const pColor = getPriorityColor(item.priority);
            const isResolved = item.status === 'RESOLVED';
            const isActive = item.status === 'ACTIVE';

            return (
              <TouchableOpacity
                style={[styles.card, !item.isRead && styles.unreadCard]}
                activeOpacity={0.8}
                onPress={() => handleItemPress(item)}
              >
                {/* Left Priority Accent Bar */}
                <View style={[styles.priorityBar, { backgroundColor: pColor }]} />

                <View style={styles.cardContent}>
                  {/* Top Row: Category, Time, Unread Dot */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.categoryBadge}>
                      <Ionicons
                        name={getCategoryIcon(item.category) as any}
                        size={13}
                        color="#4b5563"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.categoryText}>
                        {item.category.replace('_', ' ')}
                      </Text>
                    </View>

                    <View style={styles.topRightRow}>
                      <Text style={styles.timeText}>
                        {new Date(item.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {!item.isRead && <View style={styles.unreadDot} />}
                    </View>
                  </View>

                  {/* Title & Message */}
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMessage}>{item.message}</Text>

                  {/* Status & Priority Row */}
                  <View style={styles.tagRow}>
                    <View style={[styles.priorityTag, { borderColor: pColor }]}>
                      <Text style={[styles.priorityTagText, { color: pColor }]}>
                        {item.priority}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusTag,
                        isActive
                          ? styles.statusActive
                          : isResolved
                          ? styles.statusResolved
                          : styles.statusDismissed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          isActive
                            ? styles.statusTextActive
                            : isResolved
                            ? styles.statusTextResolved
                            : styles.statusTextDismissed,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>

                    {item.isAcknowledged && (
                      <View style={styles.ackBadge}>
                        <Ionicons name="shield-checkmark" size={11} color="#15803d" />
                        <Text style={styles.ackBadgeText}>Acknowledged</Text>
                      </View>
                    )}
                  </View>

                  {/* Resolution Info if resolved */}
                  {isResolved && item.resolutionNotes && (
                    <View style={styles.resolutionBox}>
                      <Text style={styles.resolutionLabel}>Resolution Notes:</Text>
                      <Text style={styles.resolutionText}>{item.resolutionNotes}</Text>
                    </View>
                  )}

                  {/* Action Buttons for Active Alerts */}
                  {isActive && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.ackBtn}
                        onPress={() => handleAcknowledge(item)}
                      >
                        <Ionicons name="shield-checkmark" size={14} color="#ffffff" />
                        <Text style={styles.ackBtnText}>Acknowledge</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.resolveBtn}
                        onPress={() => handleOpenResolve(item)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color="#ffffff" />
                        <Text style={styles.resolveBtnText}>Resolve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dismissBtn}
                        onPress={() => handleDismiss(item)}
                      >
                        <Ionicons name="close-circle-outline" size={14} color="#6b7280" />
                        <Text style={styles.dismissBtnText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Resolve Modal */}
      <Modal
        visible={resolveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResolveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resolve Alert</Text>
              <TouchableOpacity onPress={() => setResolveModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              {selectedNotification?.title}
            </Text>

            <Text style={styles.inputLabel}>Resolution Notes (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe corrective actions taken or maintenance performed..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={resolutionNotes}
              onChangeText={setResolutionNotes}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setResolveModalVisible(false)}
                disabled={submittingAction}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmResolve}
                disabled={submittingAction}
              >
                {submittingAction ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Resolution</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  markAllBtn: {
    padding: 6,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#334155',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 32,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: '#f8faff',
    borderColor: '#bfdbfe',
  },
  priorityBar: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'capitalize',
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityTagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#eff6ff',
  },
  statusResolved: {
    backgroundColor: '#f0fdf4',
  },
  statusDismissed: {
    backgroundColor: '#f1f5f9',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#1d4ed8',
  },
  statusTextResolved: {
    color: '#15803d',
  },
  statusTextDismissed: {
    color: '#64748b',
  },
  resolutionBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  resolutionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 2,
  },
  resolutionText: {
    fontSize: 12,
    color: '#166534',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  resolveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  dismissBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
    height: 100,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  modalConfirmBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  ackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  ackBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  ackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  ackBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  testAlertBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    marginRight: 4,
  },
  filterBarContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
});
