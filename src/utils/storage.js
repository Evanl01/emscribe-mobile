import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for the mobile app
export const STORAGE_KEYS = {
  patientEncounterName: 'enscribe_patientEncounterName',
  transcript: 'enscribe_transcript',
  soapSubjective: 'enscribe_soapSubjective',
  soapObjective: 'enscribe_soapObjective',
  soapAssessment: 'enscribe_soapAssessment',
  soapPlan: 'enscribe_soapPlan',
  billingSuggestion: 'enscribe_billingSuggestion',
  recordingFileMetadata: 'enscribe_recordingFileMetadata',
  recordingFile: 'enscribe_recordingFile',
  localRecordingPath: 'enscribe_localRecordingPath', // New: local file path
};

// Storage utility functions
export const storage = {
  // Get item from storage
  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  },

  // Set item in storage
  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      return false;
    }
  },

  // Remove item from storage
  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      return false;
    }
  },

  // Get JSON object from storage
  async getJSON(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting JSON ${key}:`, error);
      return null;
    }
  },

  // Set JSON object in storage
  async setJSON(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting JSON ${key}:`, error);
      return false;
    }
  },

  // Clear all storage
  async clear() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },

  // Clear specific keys
  async clearKeys(keys) {
    try {
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('Error clearing keys:', error);
      return false;
    }
  },

  // Get multiple items
  async getMultiple(keys) {
    try {
      const values = await AsyncStorage.multiGet(keys);
      const result = {};
      values.forEach(([key, value]) => {
        result[key] = value;
      });
      return result;
    } catch (error) {
      console.error('Error getting multiple items:', error);
      return {};
    }
  },

  // Set multiple items
  async setMultiple(keyValuePairs) {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
      return true;
    } catch (error) {
      console.error('Error setting multiple items:', error);
      return false;
    }
  },
};

// Helper functions for patient encounter data
export const patientEncounterStorage = {
  // Save all encounter data
  async saveEncounterData(data) {
    const keyValuePairs = [
      [STORAGE_KEYS.patientEncounterName, data.patientEncounterName || ''],
      [STORAGE_KEYS.transcript, data.transcript || ''],
      [STORAGE_KEYS.soapSubjective, data.soapSubjective || ''],
      [STORAGE_KEYS.soapObjective, data.soapObjective || ''],
      [STORAGE_KEYS.soapAssessment, data.soapAssessment || ''],
      [STORAGE_KEYS.soapPlan, data.soapPlan || ''],
      [STORAGE_KEYS.billingSuggestion, data.billingSuggestion || ''],
      [STORAGE_KEYS.localRecordingPath, data.localRecordingPath || ''], // New: save local path
    ];

    if (data.recordingFileMetadata) {
      keyValuePairs.push([
        STORAGE_KEYS.recordingFileMetadata,
        JSON.stringify(data.recordingFileMetadata),
      ]);
    }

    return await storage.setMultiple(keyValuePairs);
  },

  // Load all encounter data
  async loadEncounterData() {
    try {
      const keys = [
        STORAGE_KEYS.patientEncounterName,
        STORAGE_KEYS.transcript,
        STORAGE_KEYS.soapSubjective,
        STORAGE_KEYS.soapObjective,
        STORAGE_KEYS.soapAssessment,
        STORAGE_KEYS.soapPlan,
        STORAGE_KEYS.billingSuggestion,
        STORAGE_KEYS.localRecordingPath, // New: load local path
      ];

      const data = await storage.getMultiple(keys);
      const recordingFileMetadata = await storage.getJSON(STORAGE_KEYS.recordingFileMetadata);

      return {
        patientEncounterName: data[STORAGE_KEYS.patientEncounterName] || '',
        transcript: data[STORAGE_KEYS.transcript] || '',
        soapSubjective: data[STORAGE_KEYS.soapSubjective] || '',
        soapObjective: data[STORAGE_KEYS.soapObjective] || '',
        soapAssessment: data[STORAGE_KEYS.soapAssessment] || '',
        soapPlan: data[STORAGE_KEYS.soapPlan] || '',
        billingSuggestion: data[STORAGE_KEYS.billingSuggestion] || '',
        localRecordingPath: data[STORAGE_KEYS.localRecordingPath] || null, // New: return local path
        recordingFileMetadata,
      };
    } catch (error) {
      console.error('Error loading encounter data:', error);
      return {
        patientEncounterName: '',
        transcript: '',
        soapSubjective: '',
        soapObjective: '',
        soapAssessment: '',
        soapPlan: '',
        billingSuggestion: '',
        localRecordingPath: null, // New: include in default return
        recordingFileMetadata: null,
      };
    }
  },

  // Clear all encounter data
  async clearEncounterData() {
    const keys = Object.values(STORAGE_KEYS);
    return await storage.clearKeys(keys);
  },

  // Check if encounter data exists
  async hasEncounterData() {
    try {
      const keys = [
        STORAGE_KEYS.patientEncounterName,
        STORAGE_KEYS.transcript,
        STORAGE_KEYS.soapSubjective,
        STORAGE_KEYS.soapObjective,
        STORAGE_KEYS.soapAssessment,
        STORAGE_KEYS.soapPlan,
        STORAGE_KEYS.billingSuggestion,
        STORAGE_KEYS.localRecordingPath, // New: include local path check
      ];

      const data = await storage.getMultiple(keys);
      
      return Object.values(data).some(value => value && value.trim() !== '');
    } catch (error) {
      console.error('Error checking encounter data:', error);
      return false;
    }
  },

  // Save recording file metadata (mobile-optimized: lightweight, session-only)
  async saveRecordingFileMetadata(metadata) {
    try {
      // For mobile: only store essential metadata needed for current session
      // Add timestamps so we can expire stale metadata automatically
      const now = Date.now();
      const retentionDays = metadata.retentionDays ?? 30; // default: 30 days
      const expiresAt = now + retentionDays * 24 * 60 * 60 * 1000;

      const essentialMetadata = {
        path: metadata.path, // Supabase path (needed for API calls)
        localPath: metadata.localPath, // New: local file path (for local-first workflow)
        fileName: metadata.fileName, // Generated filename
        duration: metadata.duration, // Audio duration
        size: metadata.size, // File size
        uploadedAt: metadata.uploadedAt, // When uploaded
        isLocal: metadata.isLocal || false, // New: flag to indicate if file is local
        savedAt: now,
        expiresAt,
        // Don't store: uri (temporary), fullPath, id (not needed for mobile workflow)
      };

      return await storage.setJSON(STORAGE_KEYS.recordingFileMetadata, essentialMetadata);
    } catch (error) {
      console.error('Error saving recording metadata:', error);
      return false;
    }
  },

  // Remove expired recording metadata (and optionally other expired keys)
  async cleanupExpiredStorage() {
    try {
      const rec = await storage.getJSON(STORAGE_KEYS.recordingFileMetadata);
      if (rec && rec.expiresAt && Date.now() > rec.expiresAt) {
        console.log('[storage] Removing expired recording metadata');
        await storage.removeItem(STORAGE_KEYS.recordingFileMetadata);
      }
      return true;
    } catch (e) {
      console.error('[storage] cleanupExpiredStorage error:', e);
      return false;
    }
  },
};
