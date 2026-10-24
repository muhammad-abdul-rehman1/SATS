import * as React from 'react';
import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { assetsAPI } from '../services/api';
import { ThemedView } from '../components/themed-view';
import { NfcModal } from '../components/NfcModal';

export default function CreateAssetScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showNfcModal, setShowNfcModal] = useState(false);
  const [newAsset, setNewAsset] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    assetTag: '',
    description: '',
    assetType: 'EQUIPMENT', // Default value
    status: 'ACTIVE', // Default value
  });

  const [errors, setErrors] = useState({
    name: '',
    assetTag: '',
    assetType: '',
  });

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
      setLoading(true);
      const created = await assetsAPI.create(form);
      setNewAsset(created);
      Alert.alert(
        'Asset Created',
        'Asset created successfully! Would you like to program an NFC sticker for this asset now?',
        [
          { text: 'Later', onPress: () => router.back(), style: 'cancel' },
          { text: 'Program NFC', onPress: () => setShowNfcModal(true) },
        ]
      );
    } catch (error: any) {
      console.error('Error creating asset:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || error.message || 'Failed to create asset. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Create New Asset</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={form.name}
            onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
            placeholder="Enter asset name"
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
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Asset Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.assetType}
              onValueChange={(value) => setForm(prev => ({ ...prev, assetType: value }))}
              style={styles.picker}
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
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Create Asset</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <NfcModal
        visible={showNfcModal}
        mode="write-asset"
        target={newAsset ? { _id: newAsset._id, assetTag: newAsset.assetTag, name: newAsset.name } : null}
        onSuccess={async ({ tagId }) => {
          if (newAsset && tagId) {
            try {
              await assetsAPI.update(newAsset._id, { nfcTagId: tagId });
            } catch (e) {
              console.warn('Failed to update asset nfcTagId:', e);
            }
          }
          setShowNfcModal(false);
          Alert.alert('Success', 'Asset created and NFC sticker programmed successfully!', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }}
        onClose={() => {
          setShowNfcModal(false);
          router.back();
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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