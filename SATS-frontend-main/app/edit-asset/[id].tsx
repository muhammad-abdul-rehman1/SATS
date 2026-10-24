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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { assetsAPI } from '../../services/api';
import { ThemedView } from '../../components/themed-view';

interface Asset {
  _id: string;
  assetTag: string;
  name: string;
  description?: string;
  assetType: string;
  status: string;
  ownerId?: {
    _id: string;
    name: string;
    email: string;
  };
  roomId?: {
    _id: string;
    name: string;
    code: string;
  };
}

export default function EditAssetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    assetTag: '',
    description: '',
    assetType: 'EQUIPMENT',
    status: 'ACTIVE',
  });

  const [errors, setErrors] = useState({
    name: '',
    assetTag: '',
    assetType: '',
  });

  useEffect(() => {
    if (id) {
      loadAsset();
    }
  }, [id]);

  const loadAsset = async () => {
    try {
      setLoading(true);
      const asset = await assetsAPI.getById(id as string);
      setForm({
        name: asset.name,
        assetTag: asset.assetTag,
        description: asset.description || '',
        assetType: asset.assetType,
        status: asset.status,
      });
    } catch (error) {
      console.error('Error loading asset:', error);
      Alert.alert('Error', 'Failed to load asset details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: '',
      assetTag: '',
      assetType: '',
    };

    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    if (!form.assetTag.trim()) {
      newErrors.assetTag = 'Asset Tag is required';
      isValid = false;
    }

    if (!form.assetType) {
      newErrors.assetType = 'Asset Type is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    try {
      setSaving(true);
      await assetsAPI.update(id as string, form);
      Alert.alert(
        'Success',
        'Asset updated successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error updating asset:', error);
      const serverMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to update asset. Please try again.';
      Alert.alert(
        'Error',
        serverMsg
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading asset...</Text>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Edit Asset</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={form.name}
            onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
            placeholder="Enter asset name"
            editable={!saving}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Asset Tag *</Text>
          <TextInput
            style={[styles.input, errors.assetTag && styles.inputError]}
            value={form.assetTag}
            onChangeText={(text) => setForm(prev => ({ ...prev, assetTag: text }))}
            placeholder="Enter asset tag"
            editable={!saving}
          />
          {errors.assetTag ? <Text style={styles.errorText}>{errors.assetTag}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
            placeholder="Enter asset description"
            multiline
            numberOfLines={4}
            editable={!saving}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Asset Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.assetType}
              onValueChange={(value) => setForm(prev => ({ ...prev, assetType: value }))}
              style={styles.picker}
              enabled={!saving}
            >
              <Picker.Item label="Equipment" value="EQUIPMENT" />
              <Picker.Item label="Furniture" value="FURNITURE" />
              <Picker.Item label="Vehicle" value="VEHICLE" />
              <Picker.Item label="Electronics" value="ELECTRONICS" />
              <Picker.Item label="Other" value="OTHER" />
            </Picker>
          </View>
          {errors.assetType ? <Text style={styles.errorText}>{errors.assetType}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.status}
              onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}
              style={styles.picker}
              enabled={!saving}
            >
              <Picker.Item label="Active" value="ACTIVE" />
              <Picker.Item label="Inactive" value="INACTIVE" />
              <Picker.Item label="Maintenance" value="MAINTENANCE" />
              <Picker.Item label="Retired" value="RETIRED" />
            </Picker>
          </View>
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
