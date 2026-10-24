import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { BackHandler } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { qrAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ActiveRoom {
  _id: string;
  name: string;
  code: string;
  building?: string;
  floor?: string;
}

interface QRScannerProps {
  onScan: (data: any) => void;
  onClose: () => void;
  activeRoom?: ActiveRoom | null;
}

const { width, height } = Dimensions.get('window');

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, activeRoom }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const { user } = useAuth();

  const [showBanner, setShowBanner] = useState(false);
  const [locationMatch, setLocationMatch] = useState<boolean>(false);
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerTranslate = useRef(new Animated.Value(-60)).current;

  const [noRoomError, setNoRoomError] = useState(false);
  const noRoomOpacity = useRef(new Animated.Value(0)).current;
  const noRoomTranslate = useRef(new Animated.Value(-60)).current;

  const showNoRoomBanner = () => {
    setNoRoomError(true);
    noRoomOpacity.setValue(0);
    noRoomTranslate.setValue(-60);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(noRoomOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(noRoomTranslate, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(2200),
      Animated.parallel([
        Animated.timing(noRoomOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(noRoomTranslate, { toValue: -30, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setNoRoomError(false);
      setScanned(false);
    });
  };

  useEffect(() => {
    getCurrentLocation();
    // Hardware back (Android) should close scanner modal cleanly
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true; // prevent default
    });
    return () => sub.remove();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for asset tracking');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Block asset scans until user has set an active room
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'ASSET' && !activeRoom) {
        showNoRoomBanner();
        return;
      }
    } catch {
      // not valid JSON — let the API call handle/reject it
    }

    try {
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version.toString(),
        model: Platform.select({
          ios: 'iOS Device',
          android: 'Android Device',
          default: 'Unknown'
        })
      };

      const scanData = {
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy
        } : undefined,
        deviceInfo,
        action: 'VIEW'
      };

      const result = await qrAPI.resolve(data, scanData.location, scanData.deviceInfo, scanData.action);

      let match: boolean | null = null;
      const assetRoom = result.entity?.roomId;

      if (result.entityType === 'asset') {
        if (activeRoom) {
          // Room-ID comparison: most reliable when user scanned a room first
          const assetRoomId = assetRoom?._id ?? assetRoom;
          match = String(assetRoomId) === String(activeRoom._id);
        } else {
          // GPS fallback: use when no active room is set
          const hasCoords = assetRoom?.latitude != null && assetRoom?.longitude != null;
          if (hasCoords && location) {
            const dist = haversineDistance(
              location.coords.latitude,
              location.coords.longitude,
              assetRoom.latitude,
              assetRoom.longitude
            );
            match = dist <= 100;
          }
        }
      }

      if (match !== null) {
        setLocationMatch(match);
        setShowBanner(true);
        bannerOpacity.setValue(0);
        bannerTranslate.setValue(-60);
        Animated.sequence([
          Animated.parallel([
            Animated.timing(bannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(bannerTranslate, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
          Animated.delay(2200),
          Animated.parallel([
            Animated.timing(bannerOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(bannerTranslate, { toValue: -30, duration: 300, useNativeDriver: true }),
          ]),
        ]).start(() => {
          setShowBanner(false);
          onScan({ ...result, locationMatch: match });
        });
      } else {
        onScan(result);
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert('Error', 'Failed to process QR code. Please try again.');
      setScanned(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          {noRoomError && (
            <Animated.View
              style={[
                styles.locationBanner,
                styles.bannerError,
                { opacity: noRoomOpacity, transform: [{ translateY: noRoomTranslate }] },
              ]}
            >
              <Ionicons name="alert-circle" size={22} color="white" />
              <Text style={styles.bannerText}>Scan a room QR first before scanning assets</Text>
            </Animated.View>
          )}

          {showBanner && (
            <Animated.View
              style={[
                styles.locationBanner,
                locationMatch ? styles.bannerSuccess : styles.bannerWarning,
                { opacity: bannerOpacity, transform: [{ translateY: bannerTranslate }] },
              ]}
            >
              <Ionicons
                name={locationMatch ? 'checkmark-circle' : 'warning'}
                size={22}
                color="white"
              />
              <Text style={styles.bannerText}>
                {locationMatch ? 'Asset is in correct location' : 'Asset is NOT in expected location'}
              </Text>
            </Animated.View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Scanning area */}
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Active room hint */}
          {activeRoom ? (
            <View style={styles.activeRoomBar}>
              <Ionicons name="location" size={16} color="white" />
              <Text style={styles.activeRoomBarText} numberOfLines={1}>
                Active: {activeRoom.name} — scan only assets in this room
              </Text>
            </View>
          ) : (
            <View style={styles.noRoomBar}>
              <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.noRoomBarText} numberOfLines={1}>
                Scan a room QR first for room-based tracking
              </Text>
            </View>
          )}

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              Position the QR code within the frame to scan
            </Text>
            {scanned && (
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={() => setScanned(false)}
              >
                <Text style={styles.rescanButtonText}>Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  scanArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00ff00',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructions: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  rescanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rescanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeRoomBar: {
    backgroundColor: 'rgba(0, 122, 255, 0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  activeRoomBarText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  noRoomBar: {
    backgroundColor: 'rgba(80, 80, 80, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  noRoomBarText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    flex: 1,
  },
  locationBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  bannerSuccess: {
    backgroundColor: '#22c55e',
  },
  bannerWarning: {
    backgroundColor: '#f59e0b',
  },
  bannerError: {
    backgroundColor: '#ef4444',
  },
  bannerText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
