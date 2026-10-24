import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '../../hooks/useSafeRouter';
import { useAuth } from '../../contexts/AuthContext';
import { roomsAPI } from '../../services/api';

interface Room {
  _id: string;
  code: string;
  name: string;
  building?: string;
  floor?: string;
  latitude: number;
  longitude: number;
  description?: string;
  roomType: string;
  capacity?: number;
  scanCount: number;
  lastScanned?: string;
}

export default function RoomsScreen() {
  const router = useSafeRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

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
      setRooms(list);
    } catch (error) {
      console.error('Error loading rooms:', error);
      Alert.alert('Error', 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  };

  const handleRoomPress = (room: Room) => {
    router.push({
      pathname: '/room-detail/[id]',
      params: { id: room._id }
    });
  };

  const handleCreateRoom = () => {
    if (user?.role === 'SUPER_ADMIN') {
      router.push('/create-room');
    } else {
      Alert.alert('Access Denied', 'Only super admins can create rooms');
    }
  };

  const renderRoom = ({ item }: { item: Room }) => {
    const lat = typeof item.latitude === 'number' ? item.latitude : parseFloat(item.latitude as any);
    const lng = typeof item.longitude === 'number' ? item.longitude : parseFloat(item.longitude as any);
    const hasValidCoords = !isNaN(lat) && !isNaN(lng);

    return (
      <TouchableOpacity style={styles.roomCard} onPress={() => handleRoomPress(item)}>
        <View style={styles.roomHeader}>
          <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{item.name}</Text>
            <Text style={styles.roomCode}>#{item.code}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.roomType) }]}>
            <Text style={styles.typeText}>{(item.roomType || 'Room').replace('_', ' ')}</Text>
          </View>
        </View>
        
        {item.description ? (
          <Text style={styles.roomDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        
        <View style={styles.roomDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.building && item.floor ? `${item.building} - Floor ${item.floor}` : 'Location not specified'}
            </Text>
          </View>
          
          {typeof item.capacity === 'number' && item.capacity > 0 ? (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={16} color="#666" />
              <Text style={styles.detailText}>Capacity: {item.capacity}</Text>
            </View>
          ) : null}
          
          {hasValidCoords ? (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </Text>
            </View>
          ) : null}
        </View>
        
        <View style={styles.roomFooter}>
          <View style={styles.scanInfo}>
            <Ionicons name="qr-code-outline" size={14} color="#666" />
            <Text style={styles.scanText}>{item.scanCount ?? 0} scans</Text>
          </View>
          {item.lastScanned ? (
            <Text style={styles.lastScanned}>
              Last: {new Date(item.lastScanned).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
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
        <Text style={styles.loginPrompt}>Please log in to view rooms</Text>
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
        <Text style={styles.loadingText}>Loading rooms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rooms</Text>
        {user?.role === 'SUPER_ADMIN' && (
          <TouchableOpacity style={styles.addButton} onPress={handleCreateRoom}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {rooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No rooms found</Text>
          {user?.role === 'SUPER_ADMIN' && (
            <TouchableOpacity style={styles.createButton} onPress={handleCreateRoom}>
              <Text style={styles.createButtonText}>Create First Room</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={rooms}
          renderItem={renderRoom}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  roomCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  roomCode: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  roomDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  roomDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  scanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  lastScanned: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginPrompt: {
    fontSize: 18,
    color: '#666',
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
