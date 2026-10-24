import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { roomsAPI } from '../../services/api';
import { ThemedView } from '../../components/themed-view';
import { MapLocationPicker } from '../../components/MapLocationPicker';

interface RoomFormData {
  name: string;
  code: string;
  building: string;
  floor: string;
  description: string;
  roomType: string;
  capacity: string;
  latitude: string;
  longitude: string;
}

interface FormErrors {
  name: string;
  code: string;
  roomType: string;
  latitude: string;
  longitude: string;
}

export default function EditRoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [originalCode, setOriginalCode] = useState('');
  const [form, setForm] = useState<RoomFormData>({
    name: '',
    code: '',
    building: '',
    floor: '',
    description: '',
    roomType: 'OFFICE',
    capacity: '',
    latitude: '',
    longitude: '',
  });

  const [errors, setErrors] = useState<FormErrors>({
    name: '',
    code: '',
    roomType: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    if (id) {
      loadRoom();
    }
  }, [id]);

  const loadRoom = async () => {
    try {
      setLoading(true);
      const room = await roomsAPI.getById(id as string);
      setOriginalCode(room.code);
      setForm({
        name: room.name,
        code: room.code,
        building: room.building || '',
        floor: room.floor || '',
        description: room.description || '',
        roomType: room.roomType,
        capacity: room.capacity ? room.capacity.toString() : '',
        latitude: room.latitude.toString(),
        longitude: room.longitude.toString(),
      });
    } catch (error) {
      console.error('Error loading room:', error);
      Alert.alert('Error', 'Failed to load room details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = async () => {
    let isValid = true;
    const newErrors = {
      name: '',
      code: '',
      roomType: '',
      latitude: '',
      longitude: '',
    };

    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    if (!form.code.trim()) {
      newErrors.code = 'Room Code is required';
      isValid = false;
    } else if (form.code.trim().toUpperCase() !== originalCode.toUpperCase()) {
      // Only check if code has changed
      try {
        const normalizedCode = form.code.trim().toUpperCase();
        const exists = await roomsAPI.checkCodeExists(normalizedCode);
        if (exists) {
          newErrors.code = 'This room code is already in use';
          isValid = false;
        }
      } catch (error) {
        console.error('Error checking room code:', error);
      }
    }

    if (!form.roomType) {
      newErrors.roomType = 'Room Type is required';
      isValid = false;
    }

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.latitude = 'Enter a valid latitude (-90 to 90)';
      isValid = false;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      newErrors.longitude = 'Enter a valid longitude (-180 to 180)';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    const isValid = await validateForm();
    if (!isValid) {
      Alert.alert('Validation Error', 'Please fix the errors in the form.');
      return;
    }

    const formattedForm = {
      ...form,
      code: form.code.trim().toUpperCase(),
      capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
    };

    try {
      setSaving(true);
      await roomsAPI.update(id as string, formattedForm);
      Alert.alert(
        'Success',
        'Room updated successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error updating room:', error);
      let errorMessage = 'Failed to update room. ';
      
      if (error.response?.data?.error?.includes('duplicate key error')) {
        errorMessage = 'A room with this code already exists. Please choose a different code.';
        setErrors(prev => ({
          ...prev,
          code: 'This room code is already in use'
        }));
      } else {
        errorMessage += 'Please try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading room...</Text>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Edit Room</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={form.name}
            onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
            placeholder="Enter room name"
            editable={!saving}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Room Code *</Text>
          <TextInput
            style={[styles.input, errors.code && styles.inputError]}
            value={form.code}
            onChangeText={(text) => setForm(prev => ({ ...prev, code: text }))}
            placeholder="Enter room code"
            editable={!saving}
          />
          {errors.code ? <Text style={styles.errorText}>{errors.code}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Room Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.roomType}
              onValueChange={(value) => setForm(prev => ({ ...prev, roomType: value }))}
              style={styles.picker}
              enabled={!saving}
            >
              <Picker.Item label="Office" value="OFFICE" />
              <Picker.Item label="Meeting Room" value="MEETING_ROOM" />
              <Picker.Item label="Storage" value="STORAGE" />
              <Picker.Item label="Lab" value="LAB" />
              <Picker.Item label="Other" value="OTHER" />
            </Picker>
          </View>
          {errors.roomType ? <Text style={styles.errorText}>{errors.roomType}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Building</Text>
          <TextInput
            style={styles.input}
            value={form.building}
            onChangeText={(text) => setForm(prev => ({ ...prev, building: text }))}
            placeholder="Enter building name"
            editable={!saving}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Floor</Text>
          <TextInput
            style={styles.input}
            value={form.floor}
            onChangeText={(text) => setForm(prev => ({ ...prev, floor: text }))}
            placeholder="Enter floor number"
            editable={!saving}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Capacity</Text>
          <TextInput
            style={styles.input}
            value={form.capacity}
            onChangeText={(text) => setForm(prev => ({ ...prev, capacity: text }))}
            placeholder="Enter room capacity"
            keyboardType="numeric"
            editable={!saving}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
            placeholder="Enter room description"
            multiline
            numberOfLines={4}
            editable={!saving}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Location *</Text>
          <TouchableOpacity
            style={[styles.locationButton, errors.latitude || errors.longitude ? styles.locationButtonError : null]}
            onPress={() => setMapPickerVisible(true)}
            disabled={saving}
          >
            <View style={styles.locationButtonContent}>
              <Ionicons name="location" size={24} color="white" />
              <View style={styles.locationButtonText}>
                {form.latitude && form.longitude ? (
                  <>
                    <Text style={styles.locationButtonTitle}>Location Selected</Text>
                    <Text style={styles.locationButtonCoordinates}>
                      {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.locationButtonTitle}>Select Location on Map</Text>
                    <Text style={styles.locationButtonSubtitle}>Tap to open map and choose location</Text>
                  </>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
          {(errors.latitude || errors.longitude) ? (
            <Text style={styles.errorText}>{errors.latitude || errors.longitude}</Text>
          ) : null}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <MapLocationPicker
        visible={mapPickerVisible}
        onLocationSelect={(latitude, longitude) => {
          setForm(prev => ({
            ...prev,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
          }));
        }}
        onClose={() => setMapPickerVisible(false)}
        initialLatitude={form.latitude ? parseFloat(form.latitude) : undefined}
        initialLongitude={form.longitude ? parseFloat(form.longitude) : undefined}
      />
    </ThemedView>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  locationButtonError: {
    backgroundColor: '#ff3b30',
    shadowColor: '#ff3b30',
  },
  locationButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationButtonText: {
    flex: 1,
  },
  locationButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  locationButtonCoordinates: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'monospace',
  },
  locationButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
});
