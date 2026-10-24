import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeRouter } from '../../hooks/useSafeRouter';
import { useAuth } from '../../contexts/AuthContext';
import { roomsAPI } from '../../services/api';
import { NfcModal } from '../../components/NfcModal';

interface Room {
  _id: string;
  code: string;
  name: string;
  building?: string;
  floor?: string;
  description?: string;
  roomType: string;
  latitude: number;
  longitude: number;
  capacity?: number;
  nfcTagId?: string;
  scanCount: number;
  lastScanned?: string;
  createdAt: string;
  updatedAt: string;
}

interface Asset {
  _id: string;
  assetTag: string;
  name: string;
  assetType: string;
  status: string;
  ownerId?: { name: string; email: string };
}

export default function RoomDetailScreen() {
  const router = useSafeRouter();
  const { id } = useLocalSearchParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [showNfcModal, setShowNfcModal] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const viewShotRef = useRef<any>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (id) {
      loadRoom();
    }
  }, [id]);

  const loadAssets = async () => {
    try {
      setAssetsLoading(true);
      const data = await roomsAPI.getAssets(id as string);
      setAssets(data);
    } catch (error) {
      console.error('Error loading room assets:', error);
    } finally {
      setAssetsLoading(false);
    }
  };

  const loadRoom = async () => {
    try {
      setLoading(true);
      const data = await roomsAPI.getById(id as string);
      setRoom(data);
      loadAssets();

      // Add a small delay before loading QR code
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Load QR code with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const qrData = await roomsAPI.generateQRCode(id as string);
          setQrCode(qrData.qrCode);
          break;
        } catch (qrError) {
          retryCount++;
          if (retryCount === maxRetries) {
            console.error('Error loading QR code:', qrError);
            Alert.alert('Warning', 'Room loaded but QR code generation failed. Please try again.');
          } else {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (error) {
      console.error('Error loading room:', error);
      Alert.alert('Error', 'Failed to load room details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (user?.role === 'SUPER_ADMIN' && room) {
      router.push(`/edit-room/${room._id}`);
    } else {
      Alert.alert('Access Denied', 'Only super admins can edit rooms');
    }
  };

  const handleDelete = () => {
    if (user?.role !== 'SUPER_ADMIN') {
      Alert.alert('Access Denied', 'Only super admins can delete rooms');
      return;
    }

    Alert.alert(
      'Delete Room',
      'Are you sure you want to delete this room? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await roomsAPI.delete(id as string);
              if (router.canGoBack()) router.back(); else router.replace('/(tabs)/rooms');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete room');
            }
          }
        },
      ]
    );
  };

  // Handle composite image download
  const handleDownloadComposite = async () => {
    if (!room || !qrCode) return;
    try {
      setDownloading(true);
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
      });
      const fileName = `${room.code || room._id}-qr-details.png`;
      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          Alert.alert('Permission required', 'Please grant access to save the file.');
          return;
        }
        let base64 = '';
        if (uri.startsWith('data:')) {
          const match = uri.match(/^data:.*;base64,(.*)$/);
          base64 = match ? match[1] : '';
        } else {
          base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        }
        if (!base64) throw new Error('Invalid composite image data: base64 string is empty.');
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          fileName,
          'image/png'
        );
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert('Saved', `QR + details image saved to your Downloads.`);
      } else if (Platform.OS === 'ios') {
        const MediaLibrary = await import('expo-media-library');
        let fileUri;
        if (uri.startsWith('file://')) {
          fileUri = uri;
        } else {
          const match = uri.match(/^data:.*;base64,(.*)$/);
          const base64 = match ? match[1] : '';
          if (!base64) throw new Error('Invalid composite image data: base64 string is empty.');
          const downloadDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
          fileUri = `${downloadDir}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        }
        await MediaLibrary.saveToLibraryAsync(fileUri);
        Alert.alert('Saved', `QR + details image saved to your device's gallery.`);
      } else {
        window.open(uri, '_blank');
      }
    } catch (e: any) {
      console.error('Composite image error:', e);
      Alert.alert('Failed', e?.message || 'Unable to save the image.');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#4CAF50';
      case 'INACTIVE': return '#9E9E9E';
      case 'MAINTENANCE': return '#FF9800';
      case 'RETIRED': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'OFFICE': return '#2196F3';
      case 'MEETING_ROOM': return '#4CAF50';
      case 'STORAGE': return '#FF9800';
      case 'LAB': return '#9C27B0';
      case 'OTHER': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  if (loading || isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading room details...</Text>
      </View>
    );
  }

  if (!room) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>Room not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => { router.replace('/(tabs)/rooms'); }}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => { router.replace('/(tabs)/rooms'); }}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Room Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          {user?.role === 'SUPER_ADMIN' && (
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomName}>{room.name}</Text>
          <Text style={styles.roomCode}>#{room.code}</Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(room.roomType) }]}>
            <Text style={styles.typeText}>{room.roomType.replace('_', ' ')}</Text>
          </View>
        </View>

        {room.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{room.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Room Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Building:</Text>
            <Text style={styles.infoValue}>{room.building || 'Not specified'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="layers-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Floor:</Text>
            <Text style={styles.infoValue}>{room.floor || 'Not specified'}</Text>
          </View>
          
          {room.capacity && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Capacity:</Text>
              <Text style={styles.infoValue}>{room.capacity}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>
              {room.latitude.toFixed(6)}, {room.longitude.toFixed(6)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan Statistics</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{room.scanCount}</Text>
              <Text style={styles.statLabel}>Total Scans</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {room.lastScanned ? new Date(room.lastScanned).toLocaleDateString() : 'Never'}
              </Text>
              <Text style={styles.statLabel}>Last Scanned</Text>
            </View>
          </View>
        </View>

        {qrCode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QR Code</Text>
            <ViewShot ref={viewShotRef} style={styles.compositeContainer} options={{ format: 'png', quality: 1 }}>
              <View style={styles.compositeContent}>
                <Image source={{ uri: qrCode }} style={styles.qrCodeLarge} />
                <Text style={styles.compositeName}>{room.name}</Text>
                <Text style={styles.compositeTag}>Code: {room.code}</Text>
                <Text style={styles.compositeType}>Type: {room.roomType.replace('_', ' ')}</Text>
              </View>
            </ViewShot>
            <Text style={styles.qrText}>Scan this QR code to view room details</Text>
            <View style={styles.downloadRow}>
              <TouchableOpacity
                style={[styles.downloadButton, downloading && styles.downloadButtonDisabled]}
                disabled={downloading}
                onPress={handleDownloadComposite}
              >
                <Ionicons name="image-outline" size={18} color="white" />
                <Text style={styles.downloadButtonText}>{downloading ? 'Working...' : 'Save QR Code'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* NFC Sticker Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NFC Sticker</Text>
          <View style={styles.nfcCard}>
            <View style={styles.nfcCardLeft}>
              <View style={[styles.nfcIconCircle, room.nfcTagId ? styles.nfcIconCircleActive : {}]}>
                <Ionicons name="radio" size={24} color={room.nfcTagId ? '#34C759' : '#007AFF'} />
              </View>
              <View style={styles.nfcCardInfo}>
                <Text style={styles.nfcStatusTitle}>
                  {room.nfcTagId ? 'NFC Sticker Linked' : 'No NFC Sticker Linked'}
                </Text>
                <Text style={styles.nfcStatusSub}>
                  {room.nfcTagId
                    ? `Tag UID: ${room.nfcTagId}`
                    : 'Tap below to program a physical NFC sticker for this room'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.programNfcBtn}
              onPress={() => setShowNfcModal(true)}
            >
              <Ionicons name="radio-outline" size={18} color="white" />
              <Text style={styles.programNfcBtnText}>
                {room.nfcTagId ? 'Re-program Sticker' : 'Program NFC Sticker'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assets in this Room</Text>
          {assetsLoading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : assets.length === 0 ? (
            <View style={styles.emptyAssets}>
              <Ionicons name="cube-outline" size={32} color="#ccc" />
              <Text style={styles.emptyAssetsText}>No assets assigned to this room</Text>
            </View>
          ) : (
            assets.map((asset) => (
              <TouchableOpacity
                key={asset._id}
                style={styles.assetRow}
                onPress={() => router.push(`/asset-detail/${asset._id}`)}
              >
                <View style={styles.assetRowLeft}>
                  <Text style={styles.assetName}>{asset.name}</Text>
                  <Text style={styles.assetTag}>#{asset.assetTag}</Text>
                  {asset.ownerId && (
                    <Text style={styles.assetOwner}>{asset.ownerId.name}</Text>
                  )}
                </View>
                <View style={styles.assetRowRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(asset.status) }]}>
                    <Text style={styles.statusText}>{asset.status}</Text>
                  </View>
                  <Text style={styles.assetType}>{asset.assetType}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timestamps</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{new Date(room.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Updated:</Text>
            <Text style={styles.infoValue}>{new Date(room.updatedAt).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>
    </ScrollView>

    <NfcModal
      visible={showNfcModal}
      mode="write-room"
      target={room ? { _id: room._id, code: room.code, name: room.name } : null}
      onSuccess={async ({ tagId }) => {
        if (room) {
          setRoom(prev => (prev ? { ...prev, nfcTagId: tagId } : prev));
          if (tagId) {
            try {
              await roomsAPI.update(room._id, { nfcTagId: tagId });
            } catch (e) {
              console.warn('Failed to update room nfcTagId on server:', e);
            }
          }
        }
      }}
      onClose={() => setShowNfcModal(false)}
    />
  </>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    padding: 20,
  },
  roomHeader: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  roomCode: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    marginRight: 8,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  downloadRow: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '600',
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  compositeContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    width: 260,
    alignSelf: 'center',
  },
  compositeContent: {
    alignItems: 'center',
  },
  qrCodeLarge: {
    width: 180,
    height: 180,
    marginBottom: 12,
  },
  compositeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  compositeTag: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  compositeType: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  emptyAssets: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyAssetsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#aaa',
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  assetRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  assetName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  assetTag: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  assetOwner: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  assetRowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  assetType: {
    fontSize: 11,
    color: '#888',
  },
  qrText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  nfcCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8e8ed',
    gap: 14,
  },
  nfcCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nfcIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcIconCircleActive: {
    backgroundColor: '#EAF9EE',
  },
  nfcCardInfo: {
    flex: 1,
  },
  nfcStatusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  nfcStatusSub: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  programNfcBtn: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  programNfcBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});