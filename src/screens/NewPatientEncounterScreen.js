import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Clipboard from 'expo-clipboard';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';
import AuthService from '../services/AuthService';
import { AudioRecorder, pickAudioFile, getAudioDuration, formatDuration } from '../utils/audioUtils';
import { patientEncounterStorage, STORAGE_KEYS } from '../utils/storage';
import { getConfig } from '../utils/config';
import { supabase } from '../utils/supabaseClient';
import ENV from '../utils/environment';
import TestAudioPicker from '../components/TestAudioPicker';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import * as format from '../utils/format';

const { width: screenWidth } = Dimensions.get('window');
const config = getConfig();

const NewPatientEncounterScreen = () => {
  const { logout, user } = useAuth(); // Only get user and logout from context
  
  // Audio recording
  const audioRecorderRef = useRef(new AudioRecorder());
  const recordingIntervalRef = useRef(null);
  
  // State management
  const [activeSection, setActiveSection] = useState('upload');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingFile, setRecordingFile] = useState(null);
  const [recordingFileMetadata, setRecordingFileMetadata] = useState(null);
  const [localRecordingPath, setLocalRecordingPath] = useState(null); // New: local file path
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isOnline, setIsOnline] = useState(true); // New: network status
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [ribbonStatus, setRibbonStatus] = useState(null);
  
  // Form data
  const [patientEncounterName, setPatientEncounterName] = useState('');
  const [transcript, setTranscript] = useState('');
  const [soapSubjective, setSoapSubjective] = useState('');
  const [soapObjective, setSoapObjective] = useState('');
  const [soapAssessment, setSoapAssessment] = useState('');
  const [soapPlan, setSoapPlan] = useState('');
  const [billingSuggestion, setBillingSuggestion] = useState('');
  const [soapNoteRequested, setSoapNoteRequested] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
    requestAudioPermissions();
    checkNetworkStatus();
    return () => {
      cleanup();
    };
  }, []);

  // Check network status periodically
  useEffect(() => {
    const interval = setInterval(checkNetworkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkNetworkStatus = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const online = networkState.isConnected && networkState.isInternetReachable;
      setIsOnline(online);
      console.log('[Network] Status check:', { 
        isConnected: networkState.isConnected, 
        isInternetReachable: networkState.isInternetReachable,
        online 
      });
    } catch (error) {
      console.log('Network check failed:', error);
      setIsOnline(false);
    }
  };

  const loadSavedData = async () => {
    try {
      const savedData = await patientEncounterStorage.loadEncounterData();
      setPatientEncounterName(savedData.patientEncounterName);
      setTranscript(savedData.transcript);
      setSoapSubjective(savedData.soapSubjective);
      setSoapObjective(savedData.soapObjective);
      setSoapAssessment(savedData.soapAssessment);
      setSoapPlan(savedData.soapPlan);
      setBillingSuggestion(savedData.billingSuggestion);
      setRecordingFileMetadata(savedData.recordingFileMetadata);
      setLocalRecordingPath(savedData.localRecordingPath); // New: load local path
      
      // If any field has data, enable section 2
      const hasData = Object.values(savedData).some(value => 
        value && typeof value === 'string' && value.trim() !== ''
      );
      if (hasData) {
        setSoapNoteRequested(true);
        setActiveSection('review');
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const requestAudioPermissions = async () => {
    try {
      const hasPermission = await audioRecorderRef.current.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in your device settings to record audio.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
    }
  };

  const cleanup = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    audioRecorderRef.current.cleanup();
    deactivateKeepAwake();
  };

  // Helper: determine if status should show processing overlay
  const isProcessingStatus = (status) => {
    const processingStatuses = [
      'saving-locally',
      'uploading-to-database', 
      'starting-transcription',
      'transcription complete',
      'creating soap note'
    ];
    return processingStatuses.includes(status);
  };

  // Helper: show status (overlay for processing, ribbon for others)
  const showStatus = (statusData) => {
    setCurrentStatus(statusData);
    
    if (statusData && isProcessingStatus(statusData.status)) {
      setProcessingMessage(statusData.message || statusData.status);
      setShowProcessingOverlay(true);
    } else if (statusData) {
      // Hide processing overlay for non-processing statuses
      setShowProcessingOverlay(false);
      setProcessingMessage('');
      
      // Show ribbon for non-processing statuses
      setRibbonStatus(statusData);
      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setRibbonStatus(null);
      }, 10000);
    }
  };

  // Helper: hide processing overlay
  const hideProcessingOverlay = () => {
    setShowProcessingOverlay(false);
    setProcessingMessage('');
  };

  // Save data to storage whenever it changes
  useEffect(() => {
    const saveData = async () => {
      try {
        await patientEncounterStorage.saveEncounterData({
          patientEncounterName,
          transcript,
          soapSubjective,
          soapObjective,
          soapAssessment,
          soapPlan,
          billingSuggestion,
          recordingFileMetadata,
          localRecordingPath, // New: save local path
        });
      } catch (error) {
        console.error('Error saving data:', error);
      }
    };
    
    // Debounce saving
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [
    patientEncounterName,
    transcript,
    soapSubjective,
    soapObjective,
    soapAssessment,
    soapPlan,
    billingSuggestion,
    recordingFileMetadata,
    localRecordingPath, // New: include in dependency array
  ]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? Any unsaved changes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleImportRecording = async () => {
    try {
      const file = await pickAudioFile();
      if (!file) return;

      setIsUploading(true);
      showStatus({ status: 'saving-locally', message: 'Saving audio file...' });

      const duration = await getAudioDuration(file.uri);

      // Check if we already have a local recording (offline limit: 1 recording)
      if (localRecordingPath) {
        Alert.alert(
          'Replace Recording?',
          'You already have a recording. Replace it with this new file?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Replace', 
              style: 'destructive', 
              onPress: async () => {
                await deleteLocalRecording(); // Clean up old file
                await saveRecordingLocally(file, duration);
              }
            },
          ]
        );
        setIsUploading(false);
        hideProcessingOverlay();
        return;
      }

      await saveRecordingLocally(file, duration);
    } catch (error) {
      console.error('Error importing recording:', error);
      Alert.alert('Error', 'Failed to import recording');
      setIsUploading(false);
      showStatus({ status: 'error', message: 'Import failed: ' + error.message });
    }
  };

  // New: Save recording to local documentDirectory
  const saveRecordingLocally = async (recordingData, duration) => {
    try {
      // Generate local filename
      const timestamp = Date.now();
      const originalName = recordingData.name || 'recording.m4a';
      const extension = originalName.split('.').pop() || 'm4a';
      const localFileName = `recording_${timestamp}.${extension}`;
      const localPath = `${FileSystem.documentDirectory}${localFileName}`;

      // Copy file to local storage
      await FileSystem.copyAsync({
        from: recordingData.uri,
        to: localPath,
      });

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      
      const recordingMetadata = {
        localPath: localPath,
        fileName: localFileName,
        duration: duration,
        size: fileInfo.size,
        savedAt: new Date().toISOString(),
        isLocal: true, // Flag to indicate this is a local file
      };

      setLocalRecordingPath(localPath);
      setRecordingFileMetadata(recordingMetadata);
      showStatus({ status: 'saved-locally', message: 'Recording saved locally' });
      setIsUploading(false);

      console.log('Recording saved locally:', recordingMetadata);
    } catch (error) {
      console.error('Error saving recording locally:', error);
      setIsUploading(false);
      showStatus({ status: 'error', message: 'Failed to save recording locally' });
      throw error;
    }
  };

  // New: Delete local recording file
  const deleteLocalRecording = async () => {
    try {
      if (localRecordingPath) {
        const fileInfo = await FileSystem.getInfoAsync(localRecordingPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(localRecordingPath);
          console.log('Deleted local recording:', localRecordingPath);
        }
        setLocalRecordingPath(null);
      }
    } catch (error) {
      console.error('Error deleting local recording:', error);
    }
  };

  const startRecording = async () => {
    try {
      const success = await audioRecorderRef.current.startRecording();
      if (!success) {
        Alert.alert('Error', 'Failed to start recording');
        return;
      }

      setIsRecording(true);
      setRecordingDuration(0);
      
      // Keep screen awake during recording
      activateKeepAwakeAsync();

      // Start duration counter
      recordingIntervalRef.current = setInterval(async () => {
        const status = await audioRecorderRef.current.getRecordingStatus();
        setRecordingDuration(status.duration);
        
        // Auto-stop at 40 minutes
        if (status.duration >= 40 * 60) {
          stopRecording();
        }
      }, 1000);

      showStatus({ status: 'recording', message: 'Recording in progress...' });
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      const result = await audioRecorderRef.current.stopRecording();
      if (!result) {
        Alert.alert('Error', 'Failed to stop recording');
        return;
      }

      setIsRecording(false);
      deactivateKeepAwake();

      // Check if we already have a local recording (offline limit: 1 recording)
      if (localRecordingPath) {
        Alert.alert(
          'Replace Recording?',
          'You already have a recording. Replace it with this new recording?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Replace', 
              style: 'destructive', 
              onPress: async () => {
                await deleteLocalRecording(); // Clean up old file
                await saveRecordingLocally({
                  uri: result.uri,
                  name: `recording_${Date.now()}.m4a`,
                  duration: result.duration,
                }, result.duration);
              }
            },
          ]
        );
        return;
      }

      showStatus({ status: 'saving-locally', message: 'Saving recording...' });
      
      await saveRecordingLocally({
        uri: result.uri,
        name: `recording_${Date.now()}.m4a`,
        duration: result.duration,
      }, result.duration);
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsRecording(false);
      deactivateKeepAwake();
    }
  };

  // Helper: check if error is auth-related (matching web version pattern)
  const isAuthError = (error) => {
    if (!error) return false;
    const status = error.statusCode ?? error.status ?? error.status_code;
    return (
      status === 401 ||
      status === 403 ||
      /unauthorized|jwt|token|session/i.test(error.message || "")
    );
  };

  // Helper: attempt upload with retry logic (matching web version)
  const uploadWithRetry = async (filePath, fileData) => {
    console.log("[uploadWithRetry] attempting upload:", {
      fileName: filePath.split('/').pop(),
      filePath: filePath,
      fileSize: fileData.length,
    });

    // Get current JWT token
    const jwt = await AuthService.getAccessToken();
    if (!jwt) {
      return {
        data: null,
        error: new Error("No JWT available"),
        requiresLogin: true,
      };
    }

    // Helper to create authenticated client (matching web version)
    const createAuthClient = (token) => {
      return createClient(
        ENV.SUPABASE_URL,
        ENV.SUPABASE_ANON_KEY,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
        }
      );
    };

    try {
      // First attempt with current JWT
      const client = createAuthClient(jwt);
      const result = await client.storage
        .from("audio-files")
        .upload(filePath, fileData, { 
          cacheControl: '3600',
          upsert: false 
        });

      if (!result.error) {
        console.log("[uploadWithRetry] upload successful:", {
          fileName: filePath.split('/').pop(),
          filePath: filePath,
          resultPath: result.data?.path,
          resultId: result.data?.id
        });
        return { data: result.data, error: null };
      }

      // If not an auth error, fail immediately
      if (!isAuthError(result.error)) {
        throw result.error;
      }

      // Try refreshing token and retry once
      console.log("[uploadWithRetry] first attempt failed with auth error, retrying with refreshed token");
      const refreshSuccess = await AuthService.refreshToken();
      if (!refreshSuccess) {
        return {
          data: null,
          error: new Error("Session expired"),
          requiresLogin: true,
        };
      }

      const newToken = await AuthService.getAccessToken();
      if (!newToken) {
        return {
          data: null,
          error: new Error("Session expired"),
          requiresLogin: true,
        };
      }

      const retryClient = createAuthClient(newToken);
      const retryResult = await retryClient.storage
        .from("audio-files")
        .upload(filePath, fileData, { 
          cacheControl: '3600',
          upsert: false 
        });

      if (retryResult.error) {
        throw retryResult.error;
      }

      console.log("[uploadWithRetry] retry upload successful:", {
        fileName: filePath.split('/').pop(),
        filePath: filePath,
        resultPath: retryResult.data?.path,
        resultId: retryResult.data?.id
      });
      return { data: retryResult.data, error: null };
    } catch (error) {
      console.error('[uploadWithRetry] Upload failed:', error);
      throw error;
    }
  };

  const uploadRecording = async (recordingData) => {
    try {
      setIsUploading(true);
      showStatus({ status: 'uploading-recording', message: 'Uploading recording...' });
      
      let accessToken = await AuthService.getAccessToken();
      if (!accessToken) {
        // Try to refresh token first using backend endpoint
        console.log('[uploadRecording] No access token, attempting refresh...');
        try {
          // Get stored refresh token
          const refreshToken = await AuthService.getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Call backend refresh endpoint (mobile version with refresh token in body)
          const refreshResponse = await fetch(`${config.BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              refreshToken: refreshToken, // Mobile: send refresh token in body
              platform: 'mobile' // Indicate this is from mobile app
            }),
          });

          if (!refreshResponse.ok) {
            throw new Error(`Refresh failed: ${refreshResponse.status}`);
          }

          const refreshData = await refreshResponse.json();
          if (!refreshData?.accessToken) {
            throw new Error('No access token in refresh response');
          }

          // Update stored tokens
          await AuthService.storeTokens(refreshData.accessToken, refreshData.refreshToken);
          accessToken = refreshData.accessToken;
        } catch (refreshError) {
          console.error('[uploadRecording] Token refresh failed:', refreshError);
          Alert.alert('Session Expired', 'Please log in again');
          logout();
          return;
        }
      }

      // Extract user info from JWT (matching web version pattern)
      let user, email;
      try {
        const base64Url = accessToken.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map(function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
        );
        const jwtPayload = JSON.parse(jsonPayload);

        if (!jwtPayload.sub || !jwtPayload.email) {
          throw new Error("Invalid JWT payload");
        }

        user = { id: jwtPayload.sub, email: jwtPayload.email };
        email = jwtPayload.email;
        if (!user || !user.id || !email) {
          throw new Error(
            "Invalid user information: " + JSON.stringify({ user, email })
          );
        }
      } catch (e) {
        setIsUploading(false);
        console.error("Error decoding JWT or extracting user info:", e);
        showStatus({ status: "error", message: "Invalid session" });
        Alert.alert("Invalid session", "Please log in again.");
        logout();
        return;
      }

      // Get extension from uploaded file name (matching web version logic)
      const originalName = recordingData.name || "audio";
      const lastDot = originalName.lastIndexOf(".");
      const extension =
        lastDot !== -1 ? originalName.substring(lastDot + 1).toLowerCase() : "";
      const fileName = `${email}-${Date.now()}-${Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, "0")}${extension ? `.${extension}` : ""}`;
      
      console.log("[uploadRecording] constructed filename/path:", {
        fileName,
        filePath: `${user?.id}/${fileName}`,
        originalName
      });
      const filePath = `${user?.id || "anonymous"}/${fileName}`;

      // Read the file as base64 for React Native/Expo
      const fileInfo = await FileSystem.getInfoAsync(recordingData.uri);
      if (!fileInfo.exists) {
        throw new Error('Recording file not found');
      }

      // Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(recordingData.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to binary for upload
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      console.log('[uploadRecording] Starting upload to Supabase storage...');
      showStatus({ status: 'uploading-recording', message: 'Uploading to cloud storage...' });

      // Attempt upload with retry logic (matching web version)
      const uploadResult = await uploadWithRetry(filePath, byteArray);

      if (uploadResult?.requiresLogin) {
        Alert.alert('Session Expired', 'Please log in again.');
        logout();
        return;
      }

      const { data: uploadData, error: uploadError } = uploadResult;

      if (uploadError || !uploadData || !uploadData?.path) {
        showStatus({
          status: 'error',
          message: uploadError?.message || 'Upload failed',
        });
        throw new Error(uploadError?.message || 'Upload failed');
      }

      console.log('[uploadRecording] Successfully uploaded to Supabase:', uploadData);

      // Save lightweight metadata for current session (mobile-optimized)
      const metadata = {
        path: uploadData.path, // Supabase path for API calls
        fileName: fileName, // Generated filename 
        duration: recordingData.duration, // Audio duration
        size: fileInfo.size, // File size
        uploadedAt: new Date().toISOString(), // Upload timestamp
        // Note: Not storing temporary uri, fullPath, or id for mobile efficiency
      };

      // Store metadata and clear old recording file
      await patientEncounterStorage.saveRecordingFileMetadata(metadata);
      setRecordingFileMetadata(metadata);
      showStatus({ status: 'success', message: 'Recording Ready' });
      setIsUploading(false);

      console.log('[uploadRecording] Upload completed successfully:', metadata);
    } catch (error) {
      console.error('[uploadRecording] Error uploading recording:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload recording');
      setIsUploading(false);
      showStatus({ status: 'error', message: 'Upload failed: ' + error.message });
    }
  };

  const generateSoapNote = async () => {
    if (!localRecordingPath && !recordingFileMetadata?.path) {
      Alert.alert('Error', 'Please record or import an audio file first');
      return;
    }

    // Check network connectivity for online operations
    if (!isOnline) {
      Alert.alert(
        'Offline Mode', 
        'You must be connected to the internet to generate SOAP notes. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Clear existing data
    setPatientEncounterName('');
    setTranscript('');
    setSoapSubjective('');
    setSoapObjective('');
    setSoapAssessment('');
    setSoapPlan('');
    setBillingSuggestion('');

    setSoapNoteRequested(true);
    setIsProcessing(true);
    setActiveSection('review');

    let timeoutId;
    let soapCreationTimer; // Declare the timer variable
    const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

    try {
      timeoutId = setTimeout(() => {
        setIsProcessing(false);
        hideProcessingOverlay();
        clearTimeout(soapCreationTimer); // Clear artificial timer on timeout
        showStatus({
          status: 'error',
          message: 'Request timed out after 3 minutes. Please try again.',
        });
        Alert.alert('Timeout', 'Request timed out after 3 minutes. Please try again.');
      }, TIMEOUT_MS);

      let recordingPath;

      // If we have a local recording, upload it first
      if (localRecordingPath && recordingFileMetadata?.isLocal) {
        console.log('[SOAP] Uploading local recording before processing...');
        showStatus({ status: 'uploading-to-database', message: 'Saving recording to database...' });
        
        recordingPath = await uploadLocalRecordingToSupabase();
        if (!recordingPath) {
          throw new Error('Failed to upload recording to database');
        }
      } else if (recordingFileMetadata?.path) {
        // Already uploaded, use existing path
        recordingPath = recordingFileMetadata.path;
      } else {
        throw new Error('No recording available for processing');
      }

      showStatus({ status: 'starting-transcription', message: 'Starting transcription...' });

      // Artificial timing for better UX in React Native (since SSE doesn't stream)
      // After 1 minute, show SOAP creation status
      soapCreationTimer = setTimeout(() => {
        showStatus({ status: 'creating soap note', message: 'Creating SOAP note...' });
      }, 60000); // 1 minute

      const accessToken = await AuthService.getAccessToken();
      if (!accessToken) {
        Alert.alert('Error', 'Please log in again');
        clearTimeout(timeoutId);
        clearTimeout(soapCreationTimer);
        return;
      }

      console.log('[SOAP] Starting SOAP note generation...');
      console.log('[SOAP] Recording path:', recordingPath);

      // Call the backend API with SSE streaming support (matching web version)
      const response = await fetch(`${config.BASE_URL}${config.ENDPOINTS.PROMPT_LLM}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          recording_file_path: recordingPath, // Use uploaded path
        }),
      });
      if (!response.ok) {
        setIsProcessing(false);
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.text();
          if (errorData) {
            errorMessage += `\n${errorData}`;
          }
        } catch (e) {}
        throw new Error(errorMessage);
      }

      // React Native doesn't support streaming getReader(), so get full text response
      const responseText = await response.text();
      console.log('[generateSoapNote] Full SSE response received, length:', responseText.length);

      // Clear the artificial timer since we got the actual response
      clearTimeout(soapCreationTimer);

      // Process SSE format - split by lines and parse each data line
      const lines = responseText.split('\n');
      
      // Remove artificial delays since RN gets all data at once anyway
      for (const line of lines) {
        if (line.trim()) {
          try {
            let jsonData;
            if (line.startsWith('data: ')) {
              const jsonString = line.substring(6);
              if (jsonString.trim()) {
                jsonData = JSON.parse(jsonString);
              }
            } else if (line.startsWith('{')) {
              // Some lines might be direct JSON without 'data: ' prefix
              jsonData = JSON.parse(line);
            }
            
            if (jsonData) {
              console.log('[SSE] Processing line:', jsonData);
              
              // Check for server errors (statusCode 500 or status "error")
              if (jsonData.statusCode === 500 || jsonData.error === 'error' || jsonData.status === 'error') {
                console.error('[SSE] Error received:', jsonData);
                clearTimeout(timeoutId);
                clearTimeout(soapCreationTimer);
                setIsProcessing(false);
                hideProcessingOverlay();
                const errorMessage = jsonData.message || jsonData.error || 'Server error occurred';
                Alert.alert('Processing Error', errorMessage);
                showStatus({
                  status: 'error',
                  message: errorMessage,
                });
                return; // Exit the function early
              }
              
              // Only show status for non-error messages
              if (jsonData.status) {
                showStatus(jsonData);
              }
              
              if (jsonData.status === 'transcription complete' && jsonData.data?.transcript) {
                console.log('[SSE] Setting transcript:', jsonData.data.transcript.substring(0, 100) + '...');
                setTranscript(jsonData.data.transcript);
              }

              if (jsonData.status === 'creating soap note') {
                console.log('[SSE] Starting SOAP note generation...');
                showStatus({ status: 'creating soap note', message: 'Starting SOAP note creation...' });
                // Status will be shown by showStatus above
              }
              
              if (jsonData.status === 'soap note complete' && jsonData.data) {
                console.log('[SSE] Processing SOAP note data...');
                let noteObj = {};
                let billingObj = {};
                try {
                  // Parse the JSON string (no code block markers)
                  const parsed = typeof jsonData.data === 'string' 
                    ? JSON.parse(jsonData.data) 
                    : jsonData.data;
                  console.log('[generateSoapNote]: Parsed SOAP note data:', parsed);

                  noteObj = parsed.soap_note || {};
                  billingObj = parsed.billing || {};

                  // Set SOAP sections with proper formatting
                  let soapSubjectiveText = typeof noteObj.subjective === 'string'
                    ? noteObj.subjective
                    : format.printJsonObject(noteObj.subjective);
                  let soapObjectiveText = typeof noteObj.objective === 'string'
                    ? noteObj.objective
                    : format.printJsonObject(noteObj.objective);
                  let soapAssessmentText = typeof noteObj.assessment === 'string'
                    ? noteObj.assessment
                    : format.printJsonObject(noteObj.assessment);
                  let soapPlanText = typeof noteObj.plan === 'string'
                    ? noteObj.plan
                    : format.printJsonObject(noteObj.plan);

                  setSoapSubjective(soapSubjectiveText);
                  setSoapObjective(soapObjectiveText);
                  setSoapAssessment(soapAssessmentText);
                  setSoapPlan(soapPlanText);

                  // Format billing suggestion for display with proper formatting
                  let billingText = typeof billingObj === 'string'
                    ? billingObj
                    : format.printJsonObject(billingObj);
                  setBillingSuggestion(billingText.trim());

                  setIsProcessing(false);
                  hideProcessingOverlay();
                  showStatus({ status: 'complete', message: 'SOAP note generated successfully!' });
                  
                } catch (e) {
                  console.error('Failed to parse SOAP note JSON:', e, jsonData.data);
                  setSoapSubjective('');
                  setSoapObjective('');
                  setSoapAssessment('');
                  setSoapPlan('');
                  setBillingSuggestion('');
                }
              }
            }
          } catch (e) {
            console.log(`[SSE] Skipping unparseable line: ${line.substring(0, 100)}...`);
            // Don't throw error for unparseable lines - SSE can have empty lines or comments
          }
        }
      }

      clearTimeout(timeoutId);
      
    } catch (error) {
      clearTimeout(timeoutId);
      clearTimeout(soapCreationTimer); // Also clear the artificial timer
      console.error('[generateSoapNote]: Error', error);
      
      const errorMsg = typeof error === 'string' ? error : error?.message || '';

      if (errorMsg.includes('expired token') || errorMsg.includes('401')) {
        logout();
        return;
      }
      
      Alert.alert('Processing Error', `Error generating SOAP note: ${errorMsg}`);
      showStatus({
        status: 'error',
        message: `Failed to process recording: ${errorMsg}`,
      });
      setIsProcessing(false);
      hideProcessingOverlay();
    }
  };

  // New: Upload local recording to Supabase and save to database
  const uploadLocalRecordingToSupabase = async () => {
    try {
      if (!localRecordingPath) {
        throw new Error('No local recording to upload');
      }

      let accessToken = await AuthService.getAccessToken();
      if (!accessToken) {
        // Try to refresh token first
        console.log('[uploadLocal] No access token, attempting refresh...');
        try {
          const refreshToken = await AuthService.getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const refreshResponse = await fetch(`${config.BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              refreshToken: refreshToken,
              platform: 'mobile'
            }),
          });

          if (!refreshResponse.ok) {
            throw new Error(`Refresh failed: ${refreshResponse.status}`);
          }

          const refreshData = await refreshResponse.json();
          if (!refreshData?.accessToken) {
            throw new Error('No access token in refresh response');
          }

          await AuthService.storeTokens(refreshData.accessToken, refreshData.refreshToken);
          accessToken = refreshData.accessToken;
        } catch (refreshError) {
          console.error('[uploadLocal] Token refresh failed:', refreshError);
          Alert.alert('Session Expired', 'Please log in again');
          logout();
          return null;
        }
      }

      // Extract user info from JWT
      let user, email;
      try {
        const base64Url = accessToken.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map(function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
        );
        const jwtPayload = JSON.parse(jsonPayload);

        if (!jwtPayload.sub || !jwtPayload.email) {
          throw new Error("Invalid JWT payload");
        }

        user = { id: jwtPayload.sub, email: jwtPayload.email };
        email = jwtPayload.email;
      } catch (e) {
        console.error("Error decoding JWT:", e);
        throw new Error("Invalid session");
      }

      // Generate filename for Supabase
      const originalName = recordingFileMetadata?.fileName || "recording.m4a";
      const lastDot = originalName.lastIndexOf(".");
      const extension = lastDot !== -1 ? originalName.substring(lastDot + 1).toLowerCase() : "";
      const fileName = `${email}-${Date.now()}-${Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, "0")}${extension ? `.${extension}` : ""}`;
      
      const filePath = `${user?.id || "anonymous"}/${fileName}`;

      // Read the local file as base64
      const fileInfo = await FileSystem.getInfoAsync(localRecordingPath);
      if (!fileInfo.exists) {
        throw new Error('Local recording file not found');
      }

      const base64Data = await FileSystem.readAsStringAsync(localRecordingPath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to binary for upload
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      console.log('[uploadLocal] Starting upload to Supabase storage...');

      // Upload with retry logic
      const uploadResult = await uploadWithRetry(filePath, byteArray);

      if (uploadResult?.requiresLogin) {
        Alert.alert('Session Expired', 'Please log in again.');
        logout();
        return null;
      }

      const { data: uploadData, error: uploadError } = uploadResult;

      if (uploadError || !uploadData || !uploadData?.path) {
        throw new Error(uploadError?.message || 'Upload failed');
      }

      console.log('[uploadLocal] Successfully uploaded to Supabase:', uploadData);

      // Update metadata to reflect it's now uploaded
      const updatedMetadata = {
        path: uploadData.path, // Supabase path for API calls
        fileName: fileName, // Generated filename 
        duration: recordingFileMetadata.duration,
        size: fileInfo.size,
        uploadedAt: new Date().toISOString(),
        isLocal: false, // No longer local
      };

      await patientEncounterStorage.saveRecordingFileMetadata(updatedMetadata);
      setRecordingFileMetadata(updatedMetadata);

      // Delete local file after successful upload
      await deleteLocalRecording();

      console.log('[uploadLocal] Upload completed, local file deleted');
      return uploadData.path;

    } catch (error) {
      console.error('[uploadLocal] Error uploading local recording:', error);
      showStatus({ 
        status: 'error', 
        message: 'Failed to upload recording. Your recording is saved locally - you can try again.' 
      });
      throw error;
    }
  };

  const savePatientEncounter = async () => {
    // Validation
    const missingFields = [];
    if (!patientEncounterName.trim()) missingFields.push('Patient Encounter Name');
    if (!transcript.trim()) missingFields.push('Transcript');
    if (!soapSubjective.trim()) missingFields.push('Subjective');
    if (!soapObjective.trim()) missingFields.push('Objective');
    if (!soapAssessment.trim()) missingFields.push('Assessment');
    if (!soapPlan.trim()) missingFields.push('Plan');

    if (missingFields.length > 0) {
      Alert.alert('Missing Fields', `Please complete: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setIsSaving(true);
      
      const accessToken = await AuthService.getAccessToken();
      if (!accessToken) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      console.log('[Save] Starting patient encounter save...');

      // Recompile SOAP Note JSON object (matching web version structure)
      const soapNoteObject = {
        subjective: soapSubjective.replace(/\r?\n/g, "\n"),
        objective: soapObjective.replace(/\r?\n/g, "\n"),
        assessment: soapAssessment.replace(/\r?\n/g, "\n"),
        plan: soapPlan.replace(/\r?\n/g, "\n"),
      };

      // Get recording_file_path from metadata (matching web version)
      const recording_file_path = recordingFileMetadata?.path || '';

      // Prepare payload matching web version structure
      const payload = {
        patientEncounter: { name: patientEncounterName },
        recording: { recording_file_path },
        transcript: { transcript_text: transcript },
        soapNote_text: {
          soapNote: soapNoteObject,
          billingSuggestion,
        },
      };

      console.log('[Save] Payload prepared:', {
        ...payload,
        transcript: { transcript_text: payload.transcript.transcript_text.substring(0, 100) + '...' },
        recording: payload.recording
      });

      // Save to backend API using web version endpoint
      const response = await AuthService.makeAuthenticatedRequest(
        `${config.BASE_URL}/patient-encounters/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      console.log('[Save] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Save] API error response:', errorText);
        throw new Error(`Failed to save: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      let saveResult;
      try {
        saveResult = JSON.parse(responseText);
      } catch (parseError) {
        console.warn('[Save] Non-JSON response, treating as success:', responseText);
        saveResult = { success: true };
      }

      console.log('[Save] Save result:', saveResult);

      // Clear stored data after successful save
      await patientEncounterStorage.clearEncounterData();
      
      // Delete any remaining local recordings after successful DB save
      await deleteLocalRecording();
      
      Alert.alert(
        'Success', 
        'Patient encounter saved successfully!',
        [{ text: 'Start New Encounter', onPress: () => resetForm() }]
      );

      console.log('[Save] Patient encounter saved successfully');
      
    } catch (error) {
      console.error('[Save] Error saving patient encounter:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to save patient encounter';
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Network error - please check your connection and try again';
      } else if (error.message.includes('401')) {
        errorMessage = 'Authentication failed - please log in again';
      } else if (error.message.includes('403')) {
        errorMessage = 'Permission denied - you may not have access to save encounters';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error - please try again later';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Save Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = async () => {
    setPatientEncounterName('');
    setTranscript('');
    setSoapSubjective('');
    setSoapObjective('');
    setSoapAssessment('');
    setSoapPlan('');
    setBillingSuggestion('');
    setRecordingFile(null);
    setRecordingFileMetadata(null);
    setSoapNoteRequested(false);
    setActiveSection('upload');
    setCurrentStatus(null);
    hideProcessingOverlay();
    setRibbonStatus(null);
    
    // Clean up local recording
    await deleteLocalRecording();
  };

  const copyToClipboard = async (text) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Text copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>New Patient Encounter</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUploadSection = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setActiveSection(activeSection === 'upload' ? '' : 'upload')}
      >
        <Text style={styles.sectionTitle}>1. Record or Import Audio</Text>
        <Text style={styles.expandIcon}>{activeSection === 'upload' ? '−' : '+'}</Text>
      </TouchableOpacity>

      {activeSection === 'upload' && (
        <View style={styles.sectionContent}>
          {/* Recording Section */}
          <View style={styles.recordingSection}>
            <Text style={styles.subsectionTitle}>Record Audio</Text>
            <View style={styles.recordingControls}>
              <Text style={styles.recordingIcon}>{isRecording ? '🔴' : '🎤'}</Text>
              {isRecording && (
                <Text style={styles.recordingTime}>
                  {formatDuration(recordingDuration)} / 40:00
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording ? styles.stopButton : styles.startButton
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || isUploading}
            >
              <Text style={styles.recordButtonText}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Import Section */}
          <View style={styles.importSection}>
            <Text style={styles.subsectionTitle}>Import Audio File</Text>
            
            {/* Test Audio Picker for Simulator */}
            {ENV.IS_DEV && (
              <TestAudioPicker onAudioSelected={async (file) => {
                // Use the same local-first workflow for test files
                const duration = await getAudioDuration(file.uri);
                if (localRecordingPath) {
                  Alert.alert(
                    'Replace Recording?',
                    'You already have a recording. Replace it with this test file?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Replace', 
                        style: 'destructive', 
                        onPress: async () => {
                          await deleteLocalRecording();
                          await saveRecordingLocally(file, duration);
                        }
                      },
                    ]
                  );
                } else {
                  await saveRecordingLocally(file, duration);
                }
              }} />
            )}
            
            <TouchableOpacity
              style={styles.importButton}
              onPress={handleImportRecording}
              disabled={isRecording || isProcessing || isUploading}
            >
              <Text style={styles.importButtonIcon}>📁</Text>
              <Text style={styles.importButtonText}>Select Audio File</Text>
              <Text style={styles.importButtonSubtext}>
                MP3, M4A, WAV (Max 50MB)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status and Generate Button */}
          {(recordingFileMetadata || localRecordingPath) && (
            <View style={styles.statusSection}>
              {!isOnline && localRecordingPath && (
                <View style={[styles.statusContainer, styles.localStatus]}>
                  <Text style={styles.offlineText}>
                    ⚠️ Offline mode - recording saved locally
                  </Text>
                </View>
              )}

              {(localRecordingPath || recordingFileMetadata) && !isUploading && (
                <TouchableOpacity
                  style={[
                    styles.generateButton,
                    !isOnline && styles.disabledButton
                  ]}
                  onPress={generateSoapNote}
                  disabled={isProcessing || !isOnline}
                >
                  <Text style={styles.generateButtonText}>
                    {isProcessing ? 'Processing...' : 
                     !isOnline ? 'Must be online to generate' : 
                     'Generate SOAP Note'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderReviewSection = () => (
    <View style={[styles.section, !soapNoteRequested && styles.disabledSection]}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setActiveSection(activeSection === 'review' ? '' : 'review')}
        disabled={!soapNoteRequested}
      >
        <Text style={styles.sectionTitle}>2. Review and Edit</Text>
        <Text style={styles.expandIcon}>{activeSection === 'review' ? '−' : '+'}</Text>
      </TouchableOpacity>

      {activeSection === 'review' && soapNoteRequested && (
        <ScrollView style={styles.reviewContent} nestedScrollEnabled>
          {/* Patient Encounter Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Patient Encounter Name</Text>
            <TextInput
              style={styles.textInput}
              value={patientEncounterName}
              onChangeText={setPatientEncounterName}
              placeholder="Enter patient encounter name"
              editable={!isProcessing && !isSaving}
            />
          </View>

          {/* Transcript */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Transcript</Text>
              <TouchableOpacity onPress={() => copyToClipboard(transcript)}>
                <Text style={styles.copyButton}>Copy</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.textArea, styles.transcriptArea]}
              value={transcript}
              onChangeText={setTranscript}
              placeholder="Transcript will appear here..."
              multiline
              editable={!isProcessing && !isSaving}
            />
          </View>

          {/* SOAP Sections */}
          {[
            { label: 'Subjective', value: soapSubjective, setter: setSoapSubjective },
            { label: 'Objective', value: soapObjective, setter: setSoapObjective },
            { label: 'Assessment', value: soapAssessment, setter: setSoapAssessment },
            { label: 'Plan', value: soapPlan, setter: setSoapPlan },
          ].map((field, index) => (
            <View key={index} style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TouchableOpacity onPress={() => copyToClipboard(field.value)}>
                  <Text style={styles.copyButton}>Copy</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.textArea}
                value={field.value}
                onChangeText={field.setter}
                placeholder={`${field.label} notes will appear here...`}
                multiline
                editable={!isProcessing && !isSaving}
              />
            </View>
          ))}

          {/* Billing Suggestion */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Billing Suggestion</Text>
              <TouchableOpacity onPress={() => copyToClipboard(billingSuggestion)}>
                <Text style={styles.copyButton}>Copy</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.textArea, styles.billingArea]}
              value={billingSuggestion}
              onChangeText={setBillingSuggestion}
              placeholder="Billing suggestions will appear here..."
              multiline
              editable={!isProcessing && !isSaving}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={savePatientEncounter}
            disabled={isSaving || isProcessing}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Patient Encounter</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f7" />
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {renderHeader()}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderUploadSection()}
          {renderReviewSection()}
        </ScrollView>
        {renderProcessingOverlay()}
        {renderStatusRibbon()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  function renderProcessingOverlay() {
    if (!showProcessingOverlay) return null;
    
    return (
      <View style={styles.processingOverlay}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#007AFF" style={styles.processingSpinner} />
          <Text style={styles.processingMessage}>{processingMessage}</Text>
        </View>
      </View>
    );
  }

  function renderStatusRibbon() {
    if (!ribbonStatus) return null;
    
    return (
      <View style={[
        styles.statusRibbon,
        ribbonStatus.status === 'error' ? styles.errorRibbon : 
        ribbonStatus.status === 'success' || ribbonStatus.status === 'complete' || ribbonStatus.status === 'saved-locally' ? styles.successRibbon : 
        styles.infoRibbon
      ]}>
        <Text style={styles.ribbonText}>{ribbonStatus.message}</Text>
        <TouchableOpacity 
          style={styles.ribbonCloseButton} 
          onPress={() => setRibbonStatus(null)}
        >
          <Text style={styles.ribbonCloseText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  disabledSection: {
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  expandIcon: {
    fontSize: 20,
    color: '#666',
  },
  sectionContent: {
    padding: 16,
  },
  recordingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    color: '#333',
  },
  recordingControls: {
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  recordingTime: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#333',
  },
  recordButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 160,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#1976d2',
  },
  stopButton: {
    backgroundColor: '#d32f2f',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  importSection: {
    alignItems: 'center',
  },
  importButton: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fafafa',
    width: '100%',
  },
  importButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1976d2',
    marginBottom: 4,
  },
  importButtonSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statusSection: {
    marginTop: 16,
  },
  statusContainer: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  successStatus: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
    borderWidth: 1,
  },
  localStatus: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
    borderWidth: 1,
  },
  errorStatus: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  offlineText: {
    fontSize: 12,
    color: '#ff9800',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  generateButton: {
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewContent: {
  maxHeight: 600,
  paddingHorizontal: 16,
  paddingVertical: 12,
  },
  fieldContainer: {
  marginBottom: 20,
  // make inner fields slightly narrower with left/right spacing
  paddingHorizontal: 4,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  copyButton: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  transcriptArea: {
    minHeight: 150,
  },
  billingArea: {
    minHeight: 120,
  },
  saveButton: {
    backgroundColor: '#1976d2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingContainer: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  processingSpinner: {
    marginBottom: 16,
  },
  processingMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Status ribbon styles
  statusRibbon: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    maxWidth: 250,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 999,
  },
  successRibbon: {
    backgroundColor: '#fff',
  },
  errorRibbon: {
    backgroundColor: '#fff',
  },
  infoRibbon: {
    backgroundColor: '#fff',
  },
  ribbonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  ribbonCloseButton: {
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  ribbonCloseText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default NewPatientEncounterScreen;
