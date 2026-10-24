import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { QRScanner } from '../../components/QRScanner';
import { NfcModal } from '../../components/NfcModal';
import { useSafeRouter } from '../../hooks/useSafeRouter';
import { qrAPI } from '../../services/api';
import nfcService, { NfcStatus } from '../../utils/expo-nfc-utils';

const ACTIVE_ROOM_KEY = '@sats_active_room';

interface ActiveRoom {
  _id: string;
  name: string;
  code: string;
  building?: string;
  floor?: string;
}

export default function ScannerScreen() {
  const router = useSafeRouter();
  const { isAuthenticated } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [showNfcModal, setShowNfcModal] = useState(false);
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);
  const [nfcStatus, setNfcStatus] = useState<NfcStatus | null>(null);
  const [resolvingNfc, setResolvingNfc] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_ROOM_KEY).then(val => {
      if (val) setActiveRoom(JSON.parse(val));
    });
    checkNfc();
  }, []);

  const checkNfc = async () => {
    try {
      const status = await nfcService.checkStatus();
      setNfcStatus(status);
    } catch {
      setNfcStatus({ available: false, supported: false, enabled: false });
    }
  };

  function persistRoom(room: ActiveRoom | null) {
    setActiveRoom(room);
    if (room) {
      AsyncStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(room));
    } else {
      AsyncStorage.removeItem(ACTIVE_ROOM_KEY);
    }
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="qr-code-outline" size={64} color="#ccc" />
        <Text style={styles.loginPrompt}>Please log in to use the scanner</Text>
      </View>
    );
  }

  function handleQrResult(result: any) {
    setShowScanner(false);
    if (!result) return;

    if (result.entityType === 'room' && result.entity?._id) {
      persistRoom({
        _id: result.entity._id,
        name: result.entity.name,
        code: result.entity.code,
        building: result.entity.building,
        floor: result.entity.floor,
      });
    } else if (result.entityType === 'asset' && result.entity?._id) {
      const locParam =
        result.locationMatch === true
          ? '?locationStatus=correct'
          : result.locationMatch === false
          ? '?locationStatus=incorrect'
          : '';
      router.push(`/asset-detail/${result.entity._id}${locParam}`);
    } else {
      Alert.alert('Unknown QR', 'The scanned code is not recognized.');
    }
  }

  const handleStartNfc = async () => {
    const status = await nfcService.checkStatus();
    setNfcStatus(status);

    if (!status.available) {
      Alert.alert(
        'NFC Dev Build Required',
        'NFC scanning requires running on a physical Android device with a custom build or APK (not Expo Go).'
      );
      return;
    }

    if (!status.supported) {
      Alert.alert('NFC Not Supported', 'This device does not have NFC hardware.');
      return;
    }

    if (!status.enabled) {
      Alert.alert(
        'NFC Disabled',
        'Please turn on NFC in your device settings to scan NFC stickers.',
        [
          { text: 'Open Settings', onPress: () => nfcService.openNfcSettings() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setShowNfcModal(true);
  };

  const handleNfcSuccess = async (res: { tagId?: string; readResult?: any }) => {
    setShowNfcModal(false);
    if (!res.readResult) return;

    setResolvingNfc(true);
    try {
      // Get current location if permitted
      let locationData: any = undefined;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          locationData = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
          };
        }
      } catch {
        // Location optional
      }

      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version.toString(),
        model: Platform.select({ ios: 'iOS Device', android: 'Android Device', default: 'Unknown' }),
      };

      const payload = res.readResult.rawPayload || (res.readResult.type === 'ROOM' ? `sats://room/${res.readResult.id}` : `sats://asset/${res.readResult.id}`);

      const resolved = await qrAPI.resolve(payload, locationData, deviceInfo, 'VIEW');

      if (resolved.entityType === 'room' && resolved.entity?._id) {
        persistRoom({
          _id: resolved.entity._id,
          name: resolved.entity.name,
          code: resolved.entity.code,
          building: resolved.entity.building,
          floor: resolved.entity.floor,
        });
        Alert.alert('Room Activated via NFC', `Active room set to: ${resolved.entity.name} (${resolved.entity.code})`);
      } else if (resolved.entityType === 'asset' && resolved.entity?._id) {
        let match: boolean | null = null;
        if (activeRoom) {
          const assetRoomId = resolved.entity.roomId?._id ?? resolved.entity.roomId;
          match = String(assetRoomId) === String(activeRoom._id);
        }
        const locParam =
          match === true
            ? '?locationStatus=correct'
            : match === false
            ? '?locationStatus=incorrect'
            : '';
        router.push(`/asset-detail/${resolved.entity._id}${locParam}`);
      } else {
        Alert.alert('NFC Tag Scanned', 'The scanned tag is recognized, but no matching entity was found.');
      }
    } catch (err: any) {
      console.error('NFC resolve error:', err);
      Alert.alert(
        'NFC Scan Resolution Failed',
        err.response?.data?.message || err.message || 'Could not verify NFC sticker in database.'
      );
    } finally {
      setResolvingNfc(false);
    }
  };

  const roomSubtitle = [
    activeRoom?.building,
    activeRoom?.floor ? `Floor ${activeRoom.floor}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Scanner</Text>
          <Text style={styles.subtitle}>QR Code & NFC Stickers</Text>
        </View>
        {nfcStatus?.supported && (
          <View style={[styles.nfcBadge, nfcStatus.enabled ? styles.nfcBadgeOn : styles.nfcBadgeOff]}>
            <Ionicons name="radio" size={14} color={nfcStatus.enabled ? '#28A745' : '#FF9500'} />
            <Text style={[styles.nfcBadgeText, { color: nfcStatus.enabled ? '#28A745' : '#FF9500' }]}>
              {nfcStatus.enabled ? 'NFC Ready' : 'NFC Off'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {activeRoom ? (
          <View style={styles.activeRoomCard}>
            <View style={styles.activeRoomLeft}>
              <View style={styles.activeRoomIcon}>
                <Ionicons name="location" size={20} color="#007AFF" />
              </View>
              <View style={styles.activeRoomInfo}>
                <Text style={styles.activeRoomLabel}>Active Room</Text>
                <Text style={styles.activeRoomName}>{activeRoom.name}</Text>
                {roomSubtitle ? (
                  <Text style={styles.activeRoomSub}>{roomSubtitle}</Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => persistRoom(null)}
              style={styles.clearRoomBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={22} color="#bbb" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noRoomCard}>
            <Ionicons name="information-circle-outline" size={20} color="#888" />
            <Text style={styles.noRoomText}>
              Scan a Room QR or NFC sticker first to enable room-based asset tracking
            </Text>
          </View>
        )}

        <View style={styles.scannerIconsRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="qr-code-outline" size={54} color="#007AFF" />
          </View>
          <View style={styles.iconDivider}>
            <Text style={styles.iconDividerText}>+</Text>
          </View>
          <View style={[styles.iconCircle, styles.nfcCircle]}>
            <Ionicons name="radio" size={54} color="#34C759" />
          </View>
        </View>

        <Text style={styles.description}>
          {activeRoom
            ? `Scan or tap assets to verify they belong to ${activeRoom.name}.`
            : 'Scan or tap a room sticker to start, then scan assets to verify their location.'}
        </Text>

        {resolvingNfc && (
          <View style={styles.resolvingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.resolvingText}>Resolving NFC tag data...</Text>
          </View>
        )}

        {/* Dual Scan Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setShowScanner(true)}
          >
            <Ionicons name="camera-outline" size={24} color="white" />
            <Text style={styles.scanButtonText}>Scan QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scanButton, styles.nfcButton]}
            onPress={handleStartNfc}
          >
            <Ionicons name="radio-outline" size={24} color="white" />
            <Text style={styles.scanButtonText}>Tap NFC Sticker</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera QR Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : 'fullScreen'}
      >
        <QRScanner
          onScan={handleQrResult}
          onClose={() => setShowScanner(false)}
          activeRoom={activeRoom}
        />
      </Modal>

      {/* NFC Reader Modal */}
      <NfcModal
        visible={showNfcModal}
        mode="read"
        onSuccess={handleNfcSuccess}
        onClose={() => setShowNfcModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1C1C1E' },
  subtitle: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  nfcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  nfcBadgeOn: { backgroundColor: '#EAF9EE' },
  nfcBadgeOff: { backgroundColor: '#FFF4E5' },
  nfcBadgeText: { fontSize: 12, fontWeight: '600' },
  content: { flex: 1, padding: 20, alignItems: 'center' },

  activeRoomCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  activeRoomLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  activeRoomIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeRoomInfo: { flex: 1 },
  activeRoomLabel: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeRoomName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginTop: 1 },
  activeRoomSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  clearRoomBtn: { padding: 4 },

  noRoomCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#FFE0A3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  noRoomText: { fontSize: 13, color: '#855700', flex: 1, lineHeight: 18 },

  scannerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcCircle: {
    backgroundColor: '#EAF9EE',
  },
  iconDivider: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconDividerText: {
    fontSize: 24,
    color: '#C7C7CC',
    fontWeight: '600',
  },

  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  resolvingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  resolvingText: { fontSize: 13, color: '#007AFF', fontWeight: '500' },

  actionsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 'auto',
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  nfcButton: {
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  loginPrompt: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
