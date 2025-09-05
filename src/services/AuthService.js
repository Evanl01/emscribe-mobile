import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConfig } from '../utils/config';

const config = getConfig();

class AuthService {
  static async login(email, password) {
    try {
      const url = `${config.BASE_URL}${config.ENDPOINTS.AUTH}`;
      const payload = { action: 'sign-in', email, password };
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

      console.log('🚨 CRITICAL - ACTUAL API CALL DETAILS:');
      console.log('🚨 config.BASE_URL:', config.BASE_URL);
      console.log('🚨 Full URL being called:', url);
      console.log('🚨 config object:', config);
      console.debug('[AuthService] login -> URL:', url);
      console.debug('[AuthService] login -> payload:', payload);
      console.debug('[AuthService] login -> headers:', headers);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      let data = null;
      const responseText = await response.text();
      
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        console.warn('[AuthService] login -> failed to parse JSON response', jsonErr);
        console.warn('[AuthService] login -> response text:', responseText.substring(0, 200) + '...');
        
        // If response is HTML (likely an error page), provide more context
        if (responseText.startsWith('<')) {
          console.warn('[AuthService] login -> received HTML response (likely 404/500 error page)');
        }
      }

      console.debug('[AuthService] login -> response status:', response.status);
      console.debug('[AuthService] login -> response body:', data);

      if (!response.ok) {
        throw new Error((data && data.error) || `Login failed (${response.status})`);
      }

      // Verify we received the expected tokens
      if (!data.access_token || !data.refresh_token) {
        throw new Error('Invalid response: missing tokens');
      }

      return {
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      };
    } catch (error) {
      // Network errors in React Native often come through as TypeError
      if (error instanceof TypeError) {
        console.error('[AuthService] login network error:', error.message);
      } else {
        console.error('[AuthService] login error:', error);
      }
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  static async refreshToken() {
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call backend refresh endpoint (mobile version with refresh token in body)
      console.debug("[AuthService] refreshToken -> URL:", `${config.BASE_URL}/auth/refresh`);
      const response = await fetch(`${config.BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken, // Mobile: send refresh token in body
          platform: 'mobile' // Indicate this is from mobile app
        }),
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data?.accessToken) {
        throw new Error('No access token in refresh response');
      }

      // Store new tokens
      await this.storeTokens(data.accessToken, data.refreshToken);
      
      return true;
    } catch (error) {
      console.error('[AuthService] Token refresh error:', error);
      return false;
    }
  }

  // Get access token from secure storage
  static async getAccessToken() {
    try {
      return await SecureStore.getItemAsync('access_token');
    } catch (error) {
      console.error('[AuthService] Error getting access token:', error);
      return null;
    }
  }

  // Get refresh token from secure storage
  static async getRefreshToken() {
    try {
      return await SecureStore.getItemAsync('refresh_token');
    } catch (error) {
      console.error('[AuthService] Error getting refresh token:', error);
      return null;
    }
  }

  // Store both tokens securely
  static async storeTokens(accessToken, refreshToken) {
    try {
      await SecureStore.setItemAsync('access_token', accessToken);
      if (refreshToken) {
        await SecureStore.setItemAsync('refresh_token', refreshToken);
      }
    } catch (error) {
      console.error('[AuthService] Error storing tokens:', error);
      throw error;
    }
  }

  // Clear all tokens
  static async clearTokens() {
    try {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await AsyncStorage.removeItem('userEmail');
      await AsyncStorage.removeItem('token_expires_at');
    } catch (error) {
      console.error('[AuthService] Error clearing tokens:', error);
    }
  }

  // Check if user is authenticated
  static async isAuthenticated() {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) return false;
      
      return await this.verifyToken(accessToken);
    } catch (error) {
      console.error('[AuthService] Error checking authentication:', error);
      return false;
    }
  }

  static async verifyToken(accessToken) {
    try {
      if (!accessToken) {
        return false;
      }

      // Check if token is expired based on local expiry time
      const expiresAt = await AsyncStorage.getItem('token_expires_at');
      if (expiresAt) {
        const expiryTime = new Date(expiresAt);
        const now = new Date();
        
        // If token expires in less than 5 minutes, consider it invalid
        if (expiryTime.getTime() - now.getTime() < 5 * 60 * 1000) {
          return false;
        }
      }

      // Optionally verify with server
      const url = `${config.BASE_URL}${config.ENDPOINTS.AUTH_VERIFY}`;
      console.debug('[AuthService] verifyToken -> URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.debug('[AuthService] verifyToken -> status:', response.status);
      return response.ok;
    } catch (error) {
      console.error('[AuthService] Token verification error:', error);
      return false;
    }
  }

  static async logout() {
    try {
      const accessToken = await SecureStore.getItemAsync('access_token');
      
      if (accessToken) {
        const url = `${config.BASE_URL}${config.ENDPOINTS.AUTH_LOGOUT}`;
        console.debug('[AuthService] logout -> URL:', url);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ action: 'sign-out' }),
        });

        let body = null;
        try { body = await response.json(); } catch (e) { /* ignore */ }
        console.debug('[AuthService] logout -> status:', response.status, 'body:', body);
      }
    } catch (error) {
      console.error('[AuthService] Logout API error:', error);
      // Continue with local logout even if server call fails
    }
  }

  static async makeAuthenticatedRequest(url, options = {}) {
    try {
      const accessToken = await SecureStore.getItemAsync('access_token');
      
      if (!accessToken) {
        throw new Error('No access token available');
      }

      console.debug('[AuthService] makeAuthenticatedRequest -> url:', url);
      console.debug('[AuthService] makeAuthenticatedRequest -> original options:', options);

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      // If token is expired, try to refresh
  if (response.status === 401) {
        const refreshSuccess = await this.refreshToken();
        
        if (refreshSuccess) {
      const newAccessToken = await SecureStore.getItemAsync('access_token');
          
          // Retry the original request with new token
          return await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
        'Authorization': `Bearer ${newAccessToken}`,
            },
          });
        } else {
          throw new Error('Authentication failed');
        }
      }

      return response;
    } catch (error) {
    console.error('[AuthService] Authenticated request error:', error);
      throw error;
    }
  }
}

export default AuthService;
