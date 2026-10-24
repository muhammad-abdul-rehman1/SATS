import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMapComponent } from './GoogleMapComponent';

interface MapLocationPickerProps {
  visible: boolean;
  onLocationSelect: (latitude: number, longitude: number) => void;
  onClose: () => void;
  initialLatitude?: number;
  initialLongitude?: number;
}

// Campus coordinates fallback (COMSATS University Lahore Campus)
const DEFAULT_COORDS = {
  latitude: 31.4013,
  longitude: 74.2115,
};

export const MapLocationPicker = ({
  visible,
  onLocationSelect,
  onClose,
  initialLatitude,
  initialLongitude,
}: MapLocationPickerProps) => {
  const initialLat =
    typeof initialLatitude === 'number' && !isNaN(initialLatitude) && initialLatitude !== 0
      ? initialLatitude
      : DEFAULT_COORDS.latitude;
  const initialLng =
    typeof initialLongitude === 'number' && !isNaN(initialLongitude) && initialLongitude !== 0
      ? initialLongitude
      : DEFAULT_COORDS.longitude;

  const [location, setLocation] = useState({
    latitude: initialLat,
    longitude: initialLng,
  });
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible) {
      if (
        typeof initialLatitude === 'number' &&
        !isNaN(initialLatitude) &&
        initialLatitude !== 0 &&
        typeof initialLongitude === 'number' &&
        !isNaN(initialLongitude) &&
        initialLongitude !== 0
      ) {
        setLocation({ latitude: initialLatitude, longitude: initialLongitude });
      }
    }
  }, [visible, initialLatitude, initialLongitude]);

  const getCurrentLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Permission is required to determine your current location. You can still tap directly on the map to set a pin.'
        );
        return;
      }

      // Fast attempt: last known position
      const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
      if (lastKnown?.coords) {
        setLocation({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        });
      }

      // Then fetch fresh GPS location with a 6-second timeout
      const positionPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
      const fresh = await Promise.race([positionPromise, timeoutPromise]);

      if (fresh && 'coords' in fresh) {
        setLocation({
          latitude: fresh.coords.latitude,
          longitude: fresh.coords.longitude,
        });
      }
    } catch (error) {
      console.warn('Error getting current location:', error);
    } finally {
      setLocating(false);
    }
  };

  const handleSelectLocation = () => {
    onLocationSelect(location.latitude, location.longitude);
    onClose();
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Empty Search', 'Please enter a location name or address');
      return;
    }

    try {
      setSearching(true);
      const results = await Location.geocodeAsync(searchQuery);

      if (results && results.length > 0) {
        const firstResult = results[0];
        setLocation({
          latitude: firstResult.latitude,
          longitude: firstResult.longitude,
        });
        setSearchQuery('');
      } else {
        Alert.alert(
          'Location Not Found',
          `Could not find coordinates for "${searchQuery}". You can tap anywhere on the map to set the pin.`
        );
      }
    } catch (error) {
      console.warn('Error searching location:', error);
      Alert.alert('Search Error', 'Failed to search for location. Please try tapping on the map.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'formSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerIconButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Select Location</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search address or place..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchLocation}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearchLocation}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={18} color="white" />
            )}
          </TouchableOpacity>
        </View>

        {/* Interactive Google Map Picker - Same Google Maps engine as website */}
        <View style={styles.mapWrapper}>
          <GoogleMapComponent
            isPicker={true}
            center={location}
            zoom={16}
            selectedCoordinate={location}
            onLocationSelect={(latitude, longitude) => {
              setLocation({ latitude, longitude });
            }}
          />
        </View>

        {/* Bottom Coordinates & Action Panel */}
        <View style={styles.infoContainer}>
          <View style={styles.coordinatesBox}>
            <View>
              <Text style={styles.coordinateLabel}>Latitude</Text>
              <Text style={styles.coordinateValue}>{location.latitude.toFixed(6)}</Text>
            </View>
            <View>
              <Text style={styles.coordinateLabel}>Longitude</Text>
              <Text style={styles.coordinateValue}>{location.longitude.toFixed(6)}</Text>
            </View>
          </View>

          <View style={styles.instructionsContainer}>
            <Ionicons name="information-circle" size={18} color="#007AFF" />
            <Text style={styles.instructionsText}>
              Tap anywhere on the map or drag the pin to set the exact room location.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={getCurrentLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="locate" size={20} color="white" />
            )}
            <Text style={styles.currentLocationButtonText}>
              {locating ? 'Locating...' : 'Use Current Location'}
            </Text>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectButton}
              onPress={handleSelectLocation}
            >
              <Text style={styles.selectButtonText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 20,
  },
  headerIconButton: {
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mapWrapper: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  infoContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 5,
  },
  coordinatesBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  coordinateLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  coordinateValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },
  instructionsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 10,
  },
  instructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#444',
    lineHeight: 16,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34C759',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  currentLocationButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
  selectButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
