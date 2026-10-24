import { Platform, NativeModules, Alert } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

export interface RoomNfcPayload {
  _id: string;
  code: string;
  name?: string;
  [key: string]: any;
}

export interface AssetNfcPayload {
  _id: string;
  assetTag?: string;
  code?: string;
  name?: string;
  [key: string]: any;
}

export interface NfcReadResult {
  type: 'ROOM' | 'ASSET' | 'UNKNOWN';
  id?: string;
  code?: string;
  tagId?: string;
  rawPayload: string;
}

export interface NfcStatus {
  available: boolean; // Native module is linked (custom dev client or standalone APK)
  supported: boolean; // Device has NFC hardware
  enabled: boolean;   // NFC is turned on in Android system settings
}

class NfcService {
  private initialized = false;

  // Check if native module is linked in current runtime (guard against Expo Go crash)
  isNativeAvailable(): boolean {
    return Platform.OS !== 'web' && !!NativeModules.NfcManager;
  }

  // Get full NFC availability and enabled status
  async checkStatus(): Promise<NfcStatus> {
    if (!this.isNativeAvailable()) {
      return { available: false, supported: false, enabled: false };
    }

    try {
      if (!this.initialized) {
        await NfcManager.start();
        this.initialized = true;
      }

      const supported = await NfcManager.isSupported();
      if (!supported) {
        return { available: true, supported: false, enabled: false };
      }

      let enabled = true;
      if (Platform.OS === 'android') {
        try {
          enabled = await NfcManager.isEnabled();
        } catch {
          enabled = false;
        }
      }

      return { available: true, supported: true, enabled };
    } catch (error) {
      console.warn('NFC checkStatus error:', error);
      return { available: true, supported: false, enabled: false };
    }
  }

  async isNfcSupported(): Promise<boolean> {
    const status = await this.checkStatus();
    return status.available && status.supported && status.enabled;
  }

  // Open NFC settings (Android only)
  async openNfcSettings(): Promise<void> {
    if (!this.isNativeAvailable()) return;
    try {
      if (Platform.OS === 'android') {
        await NfcManager.goToNfcSetting();
      } else {
        Alert.alert('NFC Settings', 'Please enable NFC in your device Settings.');
      }
    } catch (error) {
      console.error('Error opening NFC settings:', error);
      Alert.alert('NFC Settings', 'Please open device Settings and enable NFC manually.');
    }
  }

  // Safely cancel any active NFC session
  async cancelOperation(): Promise<void> {
    if (!this.isNativeAvailable()) return;
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (err) {
      // Ignore cleanup errors
    }
  }

  /**
   * Write Room data to physical NFC sticker.
   * Encodes a compact NDEF payload (fits standard 144-byte NTAG213):
   * Record 1: URI sats://room/<id>
   * Record 2: JSON text {"type":"ROOM","id":"<id>","code":"<code>"}
   */
  async writeRoomToTag(room: RoomNfcPayload): Promise<{ success: boolean; tagId?: string }> {
    const status = await this.checkStatus();
    if (!status.available) {
      throw new Error('NFC requires a custom development build or APK (not supported in Expo Go).');
    }
    if (!status.supported) {
      throw new Error('This device does not have NFC hardware.');
    }
    if (!status.enabled) {
      throw new Error('NFC is turned off. Please enable NFC in your device settings.');
    }

    try {
      await this.cancelOperation();

      // Compact JSON payload (under 60 bytes)
      const roomJson = JSON.stringify({
        type: 'ROOM',
        id: String(room._id),
        code: String(room.code || ''),
      });

      // URI record + Text JSON record
      const bytes = Ndef.encodeMessage([
        Ndef.uriRecord(`sats://room/${room._id}`),
        Ndef.textRecord(roomJson),
      ]);

      if (!bytes) {
        throw new Error('Failed to encode NFC NDEF payload');
      }

      console.log(`[NFC] Requesting tech for Room ${room.code} (${bytes.length} bytes)...`);
      await NfcManager.requestTechnology(NfcTech.Ndef);

      console.log('[NFC] Writing NDEF payload...');
      await NfcManager.ndefHandler.writeNdefMessage(bytes);

      // Attempt to retrieve hardware UID of the sticker
      let tagId: string | undefined;
      try {
        const tag = await NfcManager.getTag();
        tagId = tag?.id;
      } catch (e) {
        // Tag ID retrieval is optional
      }

      console.log('[NFC] Room tag written successfully! Tag UID:', tagId);
      await this.cancelOperation();
      return { success: true, tagId };
    } catch (error: any) {
      await this.cancelOperation();
      console.error('[NFC] Write Room failed:', error);
      throw this.formatNfcError(error);
    }
  }

  /**
   * Write Asset data to physical NFC sticker.
   * Encodes a compact NDEF payload (fits standard 144-byte NTAG213):
   * Record 1: URI sats://asset/<id>
   * Record 2: JSON text {"type":"ASSET","id":"<id>","code":"<assetTag>"}
   */
  async writeAssetToTag(asset: AssetNfcPayload): Promise<{ success: boolean; tagId?: string }> {
    const status = await this.checkStatus();
    if (!status.available) {
      throw new Error('NFC requires a custom development build or APK (not supported in Expo Go).');
    }
    if (!status.supported) {
      throw new Error('This device does not have NFC hardware.');
    }
    if (!status.enabled) {
      throw new Error('NFC is turned off. Please enable NFC in your device settings.');
    }

    try {
      await this.cancelOperation();

      const tagCode = asset.assetTag || asset.code || '';
      const assetJson = JSON.stringify({
        type: 'ASSET',
        id: String(asset._id),
        code: String(tagCode),
      });

      const bytes = Ndef.encodeMessage([
        Ndef.uriRecord(`sats://asset/${asset._id}`),
        Ndef.textRecord(assetJson),
      ]);

      if (!bytes) {
        throw new Error('Failed to encode NFC NDEF payload');
      }

      console.log(`[NFC] Requesting tech for Asset ${tagCode} (${bytes.length} bytes)...`);
      await NfcManager.requestTechnology(NfcTech.Ndef);

      console.log('[NFC] Writing NDEF payload...');
      await NfcManager.ndefHandler.writeNdefMessage(bytes);

      let tagId: string | undefined;
      try {
        const tag = await NfcManager.getTag();
        tagId = tag?.id;
      } catch (e) {
        // Tag ID retrieval is optional
      }

      console.log('[NFC] Asset tag written successfully! Tag UID:', tagId);
      await this.cancelOperation();
      return { success: true, tagId };
    } catch (error: any) {
      await this.cancelOperation();
      console.error('[NFC] Write Asset failed:', error);
      throw this.formatNfcError(error);
    }
  }

  /**
   * Read NFC Sticker.
   * Connects to nearby NDEF tag and parses URI or JSON record.
   */
  async readTag(): Promise<NfcReadResult> {
    const status = await this.checkStatus();
    if (!status.available) {
      throw new Error('NFC requires a custom development build or APK (not supported in Expo Go).');
    }
    if (!status.supported) {
      throw new Error('This device does not have NFC hardware.');
    }
    if (!status.enabled) {
      throw new Error('NFC is turned off. Please enable NFC in your device settings.');
    }

    try {
      await this.cancelOperation();

      console.log('[NFC] Requesting NDEF tech to read...');
      await NfcManager.requestTechnology(NfcTech.Ndef);

      const tag = await NfcManager.ndefHandler.getNdefMessage();
      let tagObj: any = null;
      try {
        tagObj = await NfcManager.getTag();
      } catch {
        // optional
      }
      const tagId = tagObj?.id;

      await this.cancelOperation();

      if (!tag || !tag.ndefMessage || tag.ndefMessage.length === 0) {
        // Tag was read but contains no NDEF message
        if (tagId) {
          return {
            type: 'UNKNOWN',
            tagId,
            rawPayload: tagId,
          };
        }
        throw new Error('NFC tag is empty or unformatted.');
      }

      // Try reading records
      for (const record of tag.ndefMessage) {
        try {
          // Check for URI record
          if (record.tnf === Ndef.TNF_WELL_KNOWN || record.payload) {
            let decodedText = '';
            try {
              decodedText = Ndef.text.decodePayload(new Uint8Array(record.payload));
            } catch {
              try {
                decodedText = Ndef.uri.decodePayload(new Uint8Array(record.payload));
              } catch {
                // Ignore decoding error
              }
            }

            if (decodedText) {
              // 1. Check URI: sats://room/:id or sats://asset/:id
              const uriMatch = decodedText.match(/^sats:\/\/(room|r|asset|a)\/([a-fA-F0-9]{24}|[^\s/?#]+)/i);
              if (uriMatch) {
                const prefix = uriMatch[1].toLowerCase();
                const id = uriMatch[2];
                return {
                  type: (prefix === 'room' || prefix === 'r') ? 'ROOM' : 'ASSET',
                  id,
                  tagId,
                  rawPayload: decodedText,
                };
              }

              // 2. Check JSON
              try {
                const parsed = JSON.parse(decodedText);
                const t = (parsed.type || parsed.t || '').toUpperCase();
                if (t === 'ROOM' || t === 'R') {
                  return {
                    type: 'ROOM',
                    id: parsed.id || parsed._id,
                    code: parsed.code || parsed.c,
                    tagId,
                    rawPayload: decodedText,
                  };
                } else if (t === 'ASSET' || t === 'A') {
                  return {
                    type: 'ASSET',
                    id: parsed.id || parsed._id,
                    code: parsed.code || parsed.tag || parsed.assetTag,
                    tagId,
                    rawPayload: decodedText,
                  };
                }
              } catch {
                // Not JSON
              }
            }
          }
        } catch (recErr) {
          console.warn('Error reading record:', recErr);
        }
      }

      // If we couldn't parse structured records, return raw info with tagId
      return {
        type: 'UNKNOWN',
        tagId,
        rawPayload: tagId || 'Unknown NFC Tag',
      };
    } catch (error: any) {
      await this.cancelOperation();
      console.error('[NFC] Read Tag failed:', error);
      throw this.formatNfcError(error);
    }
  }

  private formatNfcError(err: any): Error {
    const msg = String(err?.message || err || '');
    if (msg.includes('user cancel') || msg.includes('cancelled')) {
      return new Error('NFC operation was cancelled.');
    }
    if (msg.includes('IOException') || msg.includes('Tag was lost') || msg.includes('transceive failed')) {
      return new Error('Tag connection was lost. Please keep the NFC sticker steady against the phone.');
    }
    if (msg.includes('capacity') || msg.includes('too large')) {
      return new Error('The tag does not have enough memory space.');
    }
    if (msg.includes('read-only') || msg.includes('locked')) {
      return new Error('The NFC sticker is locked / read-only.');
    }
    return new Error(msg || 'An unknown error occurred while communicating with the NFC tag.');
  }
}

export const nfcService = new NfcService();
export default nfcService;