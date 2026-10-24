import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { issuesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function MyIssuesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [issues, setIssues] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Preview full image modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadIssues = useCallback(async () => {
    try {
      setLoading(true);
      const res = await issuesAPI.getMyIssues({
        status: selectedStatus,
        search: search.trim(),
      });
      const list = res?.issues || [];
      setIssues(Array.isArray(list) ? list : []);
      if (res?.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.log('Error loading user issues:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus, search]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadIssues();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'HIGH':
        return { bg: '#FFEDD5', text: '#EA580C', border: '#FDBA74' };
      case 'MEDIUM':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
      case 'LOW':
      default:
        return { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Open', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'UNDER_REVIEW':
        return { label: 'Under Review', bg: '#FEF9C3', text: '#CA8A04', border: '#FDE047' };
      case 'IN_PROGRESS':
        return { label: 'In Progress', bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
      case 'RESOLVED':
        return { label: 'Resolved', bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' };
      case 'CLOSED':
        return { label: 'Closed', bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
      default:
        return { label: status, bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
    }
  };

  const renderIssueCard = ({ item }: { item: any }) => {
    const pStyle = getPriorityColor(item.priority);
    const sBadge = getStatusBadge(item.status);

    return (
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.assetTagBadge}
            onPress={() => {
              if (item.assetId?._id || item.assetId) {
                router.push(`/asset-detail/${item.assetId?._id || item.assetId}`);
              }
            }}
          >
            <Ionicons name="cube-outline" size={14} color="#007AFF" />
            <Text style={styles.assetTagText}>{item.assetTag}</Text>
          </TouchableOpacity>

          <View style={styles.badgesRight}>
            <View style={[styles.priorityBadge, { backgroundColor: pStyle.bg, borderColor: pStyle.border }]}>
              <Text style={[styles.priorityText, { color: pStyle.text }]}>{item.priority}</Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: sBadge.bg, borderColor: sBadge.border }]}>
              <View style={[styles.statusDot, { backgroundColor: sBadge.text }]} />
              <Text style={[styles.statusText, { color: sBadge.text }]}>{sBadge.label}</Text>
            </View>
          </View>
        </View>

        {/* Asset Name */}
        <Text style={styles.assetNameText}>{item.assetName}</Text>

        {/* Issue Title & Description */}
        <Text style={styles.issueTitle}>{item.title}</Text>
        <Text style={styles.issueDescription}>{item.description}</Text>

        {/* Attached Photo Thumbnail */}
        {item.imageUrl && (
          <TouchableOpacity
            style={styles.imageThumbnailContainer}
            onPress={() => setPreviewImage(item.imageUrl)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.imageThumbnail} />
            <View style={styles.imageOverlayBadge}>
              <Ionicons name="expand-outline" size={14} color="white" />
              <Text style={styles.imageOverlayText}>View Photo</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Resolution Notes (if resolved) */}
        {item.resolutionNotes && (
          <View style={styles.resolutionContainer}>
            <View style={styles.resolutionHeader}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text style={styles.resolutionTitle}>Resolution Notes</Text>
            </View>
            <Text style={styles.resolutionText}>{item.resolutionNotes}</Text>
            {item.resolvedAt && (
              <Text style={styles.resolutionDate}>
                Resolved on {new Date(item.resolvedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerInfo}>
            <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
            <Text style={styles.footerDate}>
              Reported on {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.viewAssetBtn}
            onPress={() => {
              if (item.assetId?._id || item.assetId) {
                router.push(`/asset-detail/${item.assetId?._id || item.assetId}`);
              }
            }}
          >
            <Text style={styles.viewAssetBtnText}>View Asset</Text>
            <Ionicons name="chevron-forward" size={14} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Reported Issues</Text>
            <Text style={styles.headerSubtitle}>Track and inspect your asset complaints</Text>
          </View>
          <TouchableOpacity style={styles.refreshHeaderBtn} onPress={handleRefresh}>
            <Ionicons name="refresh" size={22} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Summary Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statCount}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: '#3B82F6', borderLeftWidth: 3 }]}>
            <Text style={[styles.statCount, { color: '#2563EB' }]}>{stats.open}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: '#F59E0B', borderLeftWidth: 3 }]}>
            <Text style={[styles.statCount, { color: '#D97706' }]}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: '#10B981', borderLeftWidth: 3 }]}>
            <Text style={[styles.statCount, { color: '#16A34A' }]}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by asset, tag, or description..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadIssues}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.filterScrollWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            {[
              { id: 'ALL', label: 'All Issues' },
              { id: 'OPEN', label: 'Open' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'RESOLVED', label: 'Resolved' },
              { id: 'CLOSED', label: 'Closed' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.filterTab,
                  selectedStatus === tab.id && styles.filterTabActive,
                ]}
                onPress={() => setSelectedStatus(tab.id)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    selectedStatus === tab.id && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Issue List */}
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading reported issues...</Text>
          </View>
        ) : (
          <FlatList
            data={issues}
            renderItem={renderIssueCard}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="shield-checkmark-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Issues Found</Text>
                <Text style={styles.emptyText}>
                  {selectedStatus !== 'ALL' || search
                    ? 'No issues match the selected filter criteria.'
                    : 'You have not reported any issues with assets yet.'}
                </Text>
                <TouchableOpacity
                  style={styles.browseAssetsBtn}
                  onPress={() => router.replace('/(tabs)/assets')}
                >
                  <Text style={styles.browseAssetsBtnText}>Browse Assets to Report</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {/* Full Image Preview Modal */}
        <Modal
          visible={!!previewImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPreviewImage(null)}
        >
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity
              style={styles.closeImageBtn}
              onPress={() => setPreviewImage(null)}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  refreshHeaderBtn: {
    padding: 6,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statCount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  filterScrollWrap: {
    marginBottom: 8,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  assetTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 4,
  },
  assetTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
  badgesRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  assetNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  issueTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  issueDescription: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  imageThumbnailContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
    height: 140,
    backgroundColor: '#0F172A',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  resolutionContainer: {
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 10,
  },
  resolutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  resolutionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  resolutionText: {
    fontSize: 12,
    color: '#166534',
  },
  resolutionDate: {
    fontSize: 11,
    color: '#86EFAC',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  viewAssetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAssetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  browseAssetsBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  browseAssetsBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullscreenImage: {
    width: '90%',
    height: '80%',
  },
});
