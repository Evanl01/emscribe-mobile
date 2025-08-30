// Configuration file for API settings
import Constants from 'expo-constants';

export const API_CONFIG = {
  // Replace with your actual API base URL
  BASE_URL: 'https://emscribe.vercel.app/api',
  
  // API endpoints
  ENDPOINTS: {
    AUTH: '/auth',
    AUTH_VERIFY: '/auth/verify',
    AUTH_LOGOUT: '/auth',
    PATIENT_ENCOUNTERS: '/patient-encounters',
    PROMPT_LLM: '/prompt-llm',
  },
  
  // Request timeouts
  TIMEOUT: 10000, // 10 seconds
  
  // Token refresh settings
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
};

// Environment-specific configurations
export const ENV_CONFIG = {
  development: {
    ...API_CONFIG,
    BASE_URL: 'http://localhost:3000/api', // Local development server with /api prefix
    DEBUG: true,
  },
  production: {
    ...API_CONFIG,
    BASE_URL: 'https://emscribe.vercel.app/api',
    DEBUG: false,
  },
};

// Get current environment configuration
export const getConfig = () => {
  // Use Expo Constants to get environment info
  const nodeEnv = Constants.expoConfig?.extra?.NODE_ENV;
  const isProduction = nodeEnv === 'production' || !__DEV__;
  
  console.log('[Config] Environment detection:', {
    nodeEnv,
    isProduction,
    __DEV__,
  });
  // Prefer an explicitly set API_BASE_URL from app config (useful when running on device)
  const explicitApiBase = Constants.expoConfig?.extra?.API_BASE_URL;

  if (isProduction) {
    return {
      ...ENV_CONFIG.production,
      // allow override from extra in production if provided
      BASE_URL: explicitApiBase || ENV_CONFIG.production.BASE_URL,
    };
  }

  // Development: prefer explicit API_BASE_URL if present and not empty
  if (explicitApiBase && explicitApiBase.trim() !== '') {
    return {
      ...ENV_CONFIG.development,
      BASE_URL: explicitApiBase,
    };
  }

  // When running in Expo on a device, localhost in the app refers to the device itself.
  // Try to derive the host IP from the debuggerHost (packager) so the device can reach
  // the dev machine automatically without editing files each time.
  try {
    // `Constants.manifest.debuggerHost` is present in classic manifests (Expo Go).
    const debuggerHost = Constants.manifest?.debuggerHost || '';
    const hostPart = debuggerHost.split(':')[0];
    if (hostPart && hostPart !== 'localhost' && hostPart !== '127.0.0.1') {
      const devBase = `http://${hostPart}:3000/api`;
      console.log('[Config] Using derived dev BASE_URL from debuggerHost:', devBase);
      return {
        ...ENV_CONFIG.development,
        BASE_URL: devBase,
      };
    }
  } catch (e) {
    // ignore and fall back to default
    console.warn('[Config] Could not derive dev host from debuggerHost:', e.message || e);
  }

  // Fallback to the local development BASE_URL (useful for simulator or local web)
  return ENV_CONFIG.development;
};
