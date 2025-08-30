import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

// Audio recording utilities for mobile
export class AudioRecorder {
  constructor() {
    this.recording = null;
    this.sound = null;
    this.isRecording = false;
    this.isPaused = false;
  }

  async requestPermissions() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      return permission.granted;
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  async startRecording() {
    try {
      if (this.recording) {
        await this.stopRecording();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.isRecording = true;
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async pauseRecording() {
    try {
      if (this.recording && this.isRecording && !this.isPaused) {
        await this.recording.pauseAsync();
        this.isPaused = true;
      }
    } catch (error) {
      console.error('Failed to pause recording:', error);
      throw error;
    }
  }

  async resumeRecording() {
    try {
      if (this.recording && this.isRecording && this.isPaused) {
        await this.recording.startAsync();
        this.isPaused = false;
      }
    } catch (error) {
      console.error('Failed to resume recording:', error);
      throw error;
    }
  }

  async stopRecording() {
    try {
      if (!this.recording) return null;

      await this.recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = this.recording.getURI();
      const status = await this.recording.getStatusAsync();
      
      this.recording = null;
      this.isRecording = false;
      this.isPaused = false;

      return {
        uri,
        duration: status.durationMillis / 1000, // Convert to seconds
      };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  async getRecordingStatus() {
    try {
      if (this.recording) {
        const status = await this.recording.getStatusAsync();
        return {
          isRecording: status.isRecording,
          duration: status.durationMillis / 1000,
          isPaused: this.isPaused,
        };
      }
      return {
        isRecording: false,
        duration: 0,
        isPaused: false,
      };
    } catch (error) {
      console.error('Failed to get recording status:', error);
      return {
        isRecording: false,
        duration: 0,
        isPaused: false,
      };
    }
  }

  async playRecording(uri) {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync({ uri });
      this.sound = sound;
      
      await sound.playAsync();
      return sound;
    } catch (error) {
      console.error('Failed to play recording:', error);
      throw error;
    }
  }

  async stopPlayback() {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  }

  cleanup() {
    if (this.recording) {
      this.recording.stopAndUnloadAsync();
    }
    if (this.sound) {
      this.sound.unloadAsync();
    }
  }
}

// File picker utilities
export const pickAudioFile = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];
    
    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Please select a file smaller than 50MB');
      return null;
    }

    return {
      uri: file.uri,
      name: file.name,
      size: file.size,
      type: file.mimeType,
    };
  } catch (error) {
    console.error('Error picking audio file:', error);
    Alert.alert('Error', 'Failed to pick audio file');
    return null;
  }
};

// Get audio duration from file
export const getAudioDuration = async (uri) => {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri });
    const status = await sound.getStatusAsync();
    await sound.unloadAsync();
    
    return status.durationMillis ? status.durationMillis / 1000 : 0;
  } catch (error) {
    console.error('Error getting audio duration:', error);
    return 0;
  }
};

// Format duration helper
export const formatDuration = (seconds) => {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
