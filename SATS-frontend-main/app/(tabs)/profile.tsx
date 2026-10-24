import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '../../hooks/useSafeRouter';
import { useAuth } from '../../contexts/AuthContext';
import { qrAPI, notificationsAPI } from '../../services/api';

interface ScanStats {
  totalScans: number;
  byType: Array<{
    _id: string;
    count: number;
    lastScan: string;
  }>;
  lastScan?: {
    scannedAt: string;
    qrType: string;
  };
}

export default function ProfileScreen() {
  const router = useSafeRouter();
  const [scanStats, setScanStats] = useState<ScanStats | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadScanStats();
    }
  }, [isAuthenticated]);

  const loadScanStats = async () => {
    try {
      setLoading(true);
      const [stats, notifStats] = await Promise.allSettled([
        qrAPI.getScanStats(),
        notificationsAPI.getStats(),
      ]);

      if (stats.status === 'fulfilled' && stats.value && typeof stats.value === 'object') {
        const sanitizedStats = {
          ...stats.value,
          totalScans: stats.value.totalScans || 0,
          byType: Array.isArray(stats.value.byType) ? stats.value.byType : [],
          lastScan: stats.value.lastScan
        };
        setScanStats(sanitizedStats);
      } else {
        setScanStats({
          totalScans: 0,
          byType: [],
          lastScan: undefined
        });
      }

      if (notifStats.status === 'fulfilled' && notifStats.value?.stats?.unread !== undefined) {
        setUnreadNotifications(notifStats.value.stats.unread);
      }
    } catch (error) {
      console.error('Error loading scan stats:', error);
      setScanStats({
        totalScans: 0,
        byType: [],
        lastScan: undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleScanHistory = () => {
    // Navigate to scan history screen
    Alert.alert('Coming Soon', 'Scan history feature will be available soon');
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="person-outline" size={64} color="#ccc" />
        <Text style={styles.loginPrompt}>Please log in to view your profile</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="white" />
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: user?.role === 'SUPER_ADMIN' ? '#FF6B6B' : '#4ECDC4' }]}>
          <Text style={styles.roleText}>
            {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'User'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scan Statistics</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading stats...</Text>
          </View>
        ) : scanStats ? (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{scanStats.totalScans}</Text>
              <Text style={styles.statLabel}>Total Scans</Text>
            </View>
            
            {scanStats.byType?.map((stat) => (
              <View key={stat._id} style={styles.typeStat}>
                <View style={styles.typeInfo}>
                  <Ionicons 
                    name={stat._id === 'ASSET' ? 'cube-outline' : 'business-outline'} 
                    size={20} 
                    color="#666" 
                  />
                  <Text style={styles.typeText}>{stat._id}</Text>
                </View>
                <Text style={styles.typeCount}>{stat.count}</Text>
              </View>
            ))}
            
            {scanStats.lastScan && (
              <View style={styles.lastScan}>
                <Text style={styles.lastScanLabel}>Last Scan:</Text>
                <Text style={styles.lastScanText}>
                  {new Date(scanStats.lastScan.scannedAt).toLocaleString()}
                </Text>
                <Text style={styles.lastScanType}>
                  Type: {scanStats.lastScan.qrType}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noStatsText}>No scan statistics available</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/notifications')}>
          <View style={{ position: 'relative', width: 28, height: 28, justifyContent: 'center' }}>
            <Ionicons name="notifications-outline" size={24} color="#007AFF" />
            {unreadNotifications > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.actionText}>System Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleScanHistory}>
          <Ionicons name="time-outline" size={24} color="#007AFF" />
          <Text style={styles.actionText}>Scan History</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/my-issues')}>
          <Ionicons name="alert-circle-outline" size={24} color="#EA580C" />
          <Text style={styles.actionText}>Reported Asset Issues</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/scanner')}>
          <Ionicons name="qr-code-outline" size={24} color="#007AFF" />
          <Text style={styles.actionText}>Quick Scan</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
          <Text style={[styles.actionText, { color: '#FF6B6B' }]}>Logout</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Smart Asset Tracker v1.0.0</Text>
        <Text style={styles.footerText}>Built with React Native & Expo</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 40,
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  statsContainer: {
    gap: 16,
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  typeStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  typeCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  lastScan: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  lastScanLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  lastScanText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  lastScanType: {
    fontSize: 14,
    color: '#666',
  },
  noStatsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  loginPrompt: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
