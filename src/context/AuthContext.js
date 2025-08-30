import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import AuthService from '../services/AuthService';
import { patientEncounterStorage } from '../utils/storage';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Check if user is already authenticated on app start
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      
      // Check for valid access token
      const accessToken = await SecureStore.getItemAsync('access_token');
      const userEmail = await AsyncStorage.getItem('userEmail');
      
      if (accessToken && userEmail) {
        // Verify token is still valid
        const isValid = await AuthService.verifyToken(accessToken);
        
        if (isValid) {
          setIsAuthenticated(true);
          setUser({ email: userEmail });
        } else {
          // Try to refresh token
          const refreshSuccess = await AuthService.refreshToken();
          if (refreshSuccess) {
            const newAccessToken = await SecureStore.getItemAsync('access_token');
            const newUserEmail = await AsyncStorage.getItem('userEmail');
            setIsAuthenticated(true);
            setUser({ email: newUserEmail });
          } else {
            // Clear invalid tokens
            await clearTokens();
          }
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      await clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      
      const result = await AuthService.login(email, password);
      
      if (result.success) {
        // Store tokens securely
        await SecureStore.setItemAsync('access_token', result.access_token);
        await SecureStore.setItemAsync('refresh_token', result.refresh_token);
        await AsyncStorage.setItem('userEmail', email);
        
        if (result.expires_at) {
          await AsyncStorage.setItem('token_expires_at', result.expires_at.toString());
        }
        
        setIsAuthenticated(true);
        setUser({ email });
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Optionally call server logout endpoint here
      // await AuthService.logout();
      
      await clearTokens();
      // Clear saved encounter data and any expired metadata
      try {
        await patientEncounterStorage.clearEncounterData();
        await patientEncounterStorage.cleanupExpiredStorage();
        await clearLocalRecordings(); // New: Clear local recordings
      } catch (e) {
        console.warn('Error clearing encounter storage on logout:', e);
      }
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // New: Clear all local recording files
  const clearLocalRecordings = async () => {
    try {
      // Get all files in document directory
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      
      // Filter for recording files (those that start with 'recording_')
      const recordingFiles = files.filter(file => file.startsWith('recording_'));
      
      // Delete each recording file
      for (const file of recordingFiles) {
        const filePath = `${FileSystem.documentDirectory}${file}`;
        try {
          await FileSystem.deleteAsync(filePath);
          console.log('Deleted local recording on logout:', file);
        } catch (e) {
          console.warn('Failed to delete recording file:', file, e);
        }
      }
    } catch (error) {
      console.warn('Error clearing local recordings:', error);
    }
  };

  const clearTokens = async () => {
    try {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await AsyncStorage.removeItem('userEmail');
      await AsyncStorage.removeItem('token_expires_at');
      // Clear saved encounter data and any expired metadata on token clear too
      try {
        await patientEncounterStorage.clearEncounterData();
        await patientEncounterStorage.cleanupExpiredStorage();
        await clearLocalRecordings(); // New: Clear local recordings on token clear
      } catch (e) {
        console.warn('Error clearing encounter storage on token clear:', e);
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  };

  const getAccessToken = async () => {
    try {
      return await SecureStore.getItemAsync('access_token');
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    getAccessToken,
    checkAuthState,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
