import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeRouter } from '../../hooks/useSafeRouter';
import { useAuth } from '../../contexts/AuthContext';
import { roomsAPI } from '../../services/api';
import { GoogleMapComponent, RoomMapItem } from '../../components/GoogleMapComponent';

// Campus coordinates (COMSATS University Lahore Campus)
const CAMPUS_REGION = {
  latitude: 31.4013,
  longitude: 74.2115,
};

export default function MapScreen() {
  const router = useSafeRouter();
  const { lat, lng, roomId, assetName } = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    roomId?: string;
    assetName?: string;
  }>();

  const [rooms, setRooms] = useState<RoomMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [centerCoords, setCenterCoords] = useState(CAMPUS_REGION);
  const [targetRoomId, setTargetRoomId] = useState<string | undefined>(undefined);
  const [activeTrackingAsset, setActiveTrackingAsset] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setCenterCoords({ latitude: parsedLat, longitude: parsedLng });
      }
    }
    if (roomId) {
      setTargetRoomId(roomId);
    }
    if (assetName) {
      setActiveTrackingAsset(assetName);
    }
  }, [lat, lng, roomId, assetName]);

  useEffect(() => {
    if (isAuthenticated) {
      loadRooms();
    }
  }, [isAuthenticated]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await roomsAPI.getAll();
      const list = Array.isArray(data) ? data : (data?.rooms || []);

      const parsedRooms: RoomMapItem[] = list
        .map((room: any) => ({
          ...room,
          latitude: typeof room.latitude === 'string' ? parseFloat(room.latitude) : Number(room.latitude),
          longitude: typeof room.longitude === 'string' ? parseFloat(room.longitude) : Number(room.longitude),
        }))
        .filter(
          (room: any) =>
            room &&
            typeof room.latitude === 'number' &&
            !isNaN(room.latitude) &&
            typeof room.longitude === 'number' &&
            !isNaN(room.longitude) &&
            room.latitude !== 0 &&
            room.longitude !== 0
        );

      setRooms(parsedRooms);
    } catch (error) {
      console.error('Error loading rooms:', error);
      Alert.alert('Error', 'Failed to load room locations');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomDetail = (roomId: string) => {
    router.push(`/room-detail/${roomId}`);
  };

  const centerOnCampus = () => {
    setCenterCoords({ ...CAMPUS_REGION });
  };

  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="map-outline" size={64} color="#ccc" />
        <Text style={styles.loginPrompt}>Please log in to view the map</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Room Map</Text>
          <Text style={styles.mapBadge}>Google Maps</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={centerOnCampus}
            accessibilityLabel="Center on Campus"
          >
            <Ionicons name="school-outline" size={22} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={loadRooms}
            accessibilityLabel="Refresh Rooms"
          >
            <Ionicons name="refresh" size={22} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {activeTrackingAsset && (
        <View style={styles.trackingBanner}>
          <Ionicons name="navigate-circle" size={24} color="#007AFF" />
          <View style={styles.trackingInfo}>
            <Text style={styles.trackingLabel}>TRACKING ASSET</Text>
            <Text style={styles.trackingAssetName} numberOfLines={1}>{activeTrackingAsset}</Text>
          </View>
          {targetRoomId && (
            <TouchableOpacity
              style={styles.trackingButton}
              onPress={() => router.push(`/room-detail/${targetRoomId}`)}
            >
              <Text style={styles.trackingButtonText}>Room Assets</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.trackingCloseButton}
            onPress={() => {
              setActiveTrackingAsset(null);
              setTargetRoomId(undefined);
            }}
          >
            <Ionicons name="close" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {/* Google Map - Same JavaScript API engine used in website */}
      <View style={styles.mapContainer}>
        <GoogleMapComponent
          rooms={rooms}
          center={centerCoords}
          zoom={17}
          selectedRoomId={targetRoomId}
          onRoomDetail={handleRoomDetail}
        />
      </View>

      {/* Room Types Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Room Types:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.legendText}>Office</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Meeting Room</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Storage</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#9C27B0' }]} />
            <Text style={styles.legendText}>Lab</Text>
          </View>
        </View>
      </View>
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  mapBadge: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f4f8',
  },
  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    borderBottomWidth: 1,
    borderBottomColor: '#B9E0FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    zIndex: 9,
  },
  trackingInfo: {
    flex: 1,
  },
  trackingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 0.5,
  },
  trackingAssetName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  trackingButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  trackingButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  trackingCloseButton: {
    padding: 4,
  },
  mapContainer: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  legendItems: {
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    color: '#666',
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
