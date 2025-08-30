import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

const TestAudioPicker = ({ onAudioSelected }) => {
  // Test audio files - put actual audio files in assets/test-audio/
  const testAudioFiles = [
    {
      assetPath: require('../../assets/test-audio/test1.m4a'), // You'll add this file
      name: 'test1.m4a',
      displayName: 'Test Recording 1 (Sample)',
      duration: 30, // Approximate duration
    },
    {
      assetPath: require('../../assets/test-audio/test2.m4a'), // You'll add this file  
      name: 'test2.m4a',
      displayName: 'Test Recording 2 (Sample)',
      duration: 60,
    }
  ];

  const selectBundledAudio = async (audioFile) => {
    try {
      // Load the asset from the app bundle
      const asset = Asset.fromModule(audioFile.assetPath);
      await asset.downloadAsync();
      
      // Copy to a temporary location that the app can access
      const tempUri = FileSystem.documentDirectory + audioFile.name;
      await FileSystem.copyAsync({
        from: asset.localUri,
        to: tempUri,
      });
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(tempUri);
      
      const file = {
        uri: tempUri,
        name: audioFile.name,
        size: fileInfo.size,
        type: 'audio/m4a',
        duration: audioFile.duration,
      };
      
      console.log('[TestAudioPicker] Selected bundled audio file:', file);
      onAudioSelected(file);
      
    } catch (error) {
      console.error('Error loading bundled audio:', error);
      // Fallback to mock file if bundled file not found
      await createMockAudio(audioFile);
    }
  };

  const createMockAudio = async (audioFile) => {
    try {
      // Create a small mock audio file for testing upload/processing flow
      const mockAudioContent = 'MOCK_AUDIO_DATA_FOR_TESTING_' + Date.now();
      const tempUri = FileSystem.documentDirectory + audioFile.name;
      
      await FileSystem.writeAsStringAsync(tempUri, mockAudioContent);
      const fileInfo = await FileSystem.getInfoAsync(tempUri);
      
      const mockFile = {
        uri: tempUri,
        name: audioFile.name,
        size: fileInfo.size,
        type: 'audio/m4a',
        duration: audioFile.duration,
      };
      
      Alert.alert(
        'Mock Audio Created',
        `Created mock file: ${audioFile.displayName}\n\n⚠️ This is test data for simulator.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Use Mock File', onPress: () => onAudioSelected(mockFile) }
        ]
      );
      
    } catch (error) {
      console.error('Error creating mock audio:', error);
      Alert.alert('Error', 'Failed to create test audio file');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎵 Test Audio Files</Text>
      <Text style={styles.subtitle}>For simulator testing</Text>
      
      {testAudioFiles.map((file, index) => (
        <TouchableOpacity
          key={index}
          style={styles.testButton}
          onPress={() => selectBundledAudio(file)}
        >
          <Text style={styles.testButtonText}>{file.displayName}</Text>
          <Text style={styles.testButtonSubtext}>{file.name}</Text>
        </TouchableOpacity>
      ))}
      
      <Text style={styles.note}>
        💡 Add audio files to assets/test-audio/ or use Files app drag & drop
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4caf50',
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    color: '#2e7d32',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  testButton: {
    backgroundColor: '#4caf50',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  testButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 14,
  },
  testButtonSubtext: {
    color: '#e8f5e8',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 2,
  },
  note: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default TestAudioPicker;
