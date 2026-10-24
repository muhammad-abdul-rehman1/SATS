import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import nfcService, { RoomNfcPayload, AssetNfcPayload, NfcReadResult } from '../utils/expo-nfc-utils';

export type NfcModalMode = 'read' | 'write-room' | 'write-asset';

interface NfcModalProps {
  visible: boolean;
  mode: NfcModalMode;
  target?: RoomNfcPayload | AssetNfcPayload | null;
  onSuccess?: (result: { tagId?: string; readResult?: NfcReadResult }) => void;
  onClose: () => void;
}

export const NfcModal: React.FC<NfcModalProps> = ({
  visible,
  mode,
  target,
  onSuccess,
  onClose,
}) => {
  const [status, setStatus] = useState<'idle' | 'ready' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [tagUid, setTagUid] = useState<string | null>(null);

  // Pulse animation for the NFC wave icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      startPulse();
      runNfcOperation();
    } else {
      stopPulse();
      nfcService.cancelOperation();
      setStatus('idle');
      setStatusMessage('');
      setTagUid(null);
    }
    return () => {
      stopPulse();
      nfcService.cancelOperation();
    };
  }, [visible]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const triggerHaptic = (type: 'success' | 'error' | 'medium') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (type === 'error') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    } catch {
      // Haptics optional
    }
  };

  const runNfcOperation = async () => {
    setStatus('ready');
    setStatusMessage('Hold an NFC sticker against the back or top of your phone...');

    try {
      if (mode === 'write-room' && target) {
        setStatusMessage(`Ready to program Room ${target.code || target.name}. Touch sticker to phone...`);
        const res = await nfcService.writeRoomToTag(target as RoomNfcPayload);
        triggerHaptic('success');
        setStatus('success');
        setTagUid(res.tagId || null);
        setStatusMessage(`Success! Room programmed into NFC sticker.${res.tagId ? `\nTag ID: ${res.tagId}` : ''}`);
        if (onSuccess) onSuccess({ tagId: res.tagId });
      } else if (mode === 'write-asset' && target) {
        const code = (target as AssetNfcPayload).assetTag || (target as AssetNfcPayload).code || 'Asset';
        setStatusMessage(`Ready to program ${code}. Touch sticker to phone...`);
        const res = await nfcService.writeAssetToTag(target as AssetNfcPayload);
        triggerHaptic('success');
        setStatus('success');
        setTagUid(res.tagId || null);
        setStatusMessage(`Success! Asset programmed into NFC sticker.${res.tagId ? `\nTag ID: ${res.tagId}` : ''}`);
        if (onSuccess) onSuccess({ tagId: res.tagId });
      } else if (mode === 'read') {
        setStatusMessage('Scanning for NFC sticker. Touch tag to phone...');
        const readRes = await nfcService.readTag();
        triggerHaptic('success');
        setStatus('success');
        setTagUid(readRes.tagId || null);
        setStatusMessage(`Tag Detected! Resolving ${readRes.type}...`);
        if (onSuccess) onSuccess({ tagId: readRes.tagId, readResult: readRes });
      }
    } catch (err: any) {
      triggerHaptic('error');
      setStatus('error');
      setStatusMessage(err.message || 'Failed to communicate with NFC tag.');
    }
  };

  const handleRetry = () => {
    runNfcOperation();
  };

  const handleClose = () => {
    nfcService.cancelOperation();
    onClose();
  };

  const getTitle = () => {
    switch (mode) {
      case 'write-room':
        return 'Program Room NFC Sticker';
      case 'write-asset':
        return 'Program Asset NFC Sticker';
      case 'read':
        return 'Scan NFC Sticker';
      default:
        return 'NFC Reader / Writer';
    }
  };

  const getTargetDescription = () => {
    if (!target) return null;
    if (mode === 'write-room') {
      return `Room: ${(target as RoomNfcPayload).name || (target as RoomNfcPayload).code}`;
    }
    if (mode === 'write-asset') {
      const a = target as AssetNfcPayload;
      return `${a.name || 'Asset'} (${a.assetTag || a.code || ''})`;
    }
    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{getTitle()}</Text>

          {getTargetDescription() ? (
            <View style={styles.targetBadge}>
              <Ionicons
                name={mode === 'write-room' ? 'location-outline' : 'cube-outline'}
                size={16}
                color="#007AFF"
              />
              <Text style={styles.targetText}>{getTargetDescription()}</Text>
            </View>
          ) : null}

          {/* Central Icon */}
          <View style={styles.iconContainer}>
            {status === 'ready' || status === 'processing' ? (
              <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
                <Ionicons name="radio" size={68} color="#007AFF" />
              </Animated.View>
            ) : status === 'success' ? (
              <View style={[styles.pulseCircle, styles.successCircle]}>
                <Ionicons name="checkmark-circle" size={68} color="#34C759" />
              </View>
            ) : status === 'error' ? (
              <View style={[styles.pulseCircle, styles.errorCircle]}>
                <Ionicons name="alert-circle" size={68} color="#FF3B30" />
              </View>
            ) : (
              <Ionicons name="radio-outline" size={68} color="#999" />
            )}
          </View>

          {/* Status Message */}
          <Text
            style={[
              styles.message,
              status === 'success' && styles.messageSuccess,
              status === 'error' && styles.messageError,
            ]}
          >
            {statusMessage}
          </Text>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            {status === 'error' ? (
              <>
                <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleClose}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleRetry}>
                  <Text style={styles.btnPrimaryText}>Retry</Text>
                </TouchableOpacity>
              </>
            ) : status === 'success' ? (
              <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={handleClose}>
                <Text style={styles.btnPrimaryText}>Done</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleClose}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF5FF',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  targetText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  iconContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  pulseCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCircle: {
    backgroundColor: '#EAF9EE',
  },
  errorCircle: {
    backgroundColor: '#FEECEC',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#48484A',
    textAlign: 'center',
    marginBottom: 20,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  messageSuccess: {
    color: '#28A745',
    fontWeight: '600',
  },
  messageError: {
    color: '#D32F2F',
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#007AFF',
  },
  btnSuccess: {
    backgroundColor: '#34C759',
  },
  btnSecondary: {
    backgroundColor: '#F2F2F7',
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#636366',
  },
});
