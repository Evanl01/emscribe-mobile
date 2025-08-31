// Configuration file for API settings
import { ENV } from './environment';

export const API_CONFIG = {
  // API endpoints
  ENDPOINTS: {
    AUTH: '/auth',
    AUTH_VERIFY: '/auth/verify', 
    AUTH_LOGOUT: '/auth',
    PATIENT_ENCOUNTERS: '/patient-encounters',
    PROMPT_LLM: '/prompt-llm',
  },
  
  // Request timeouts
  TIMEOUT: 100000, // 100 seconds
  // Token refresh settings
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
};

// Get current environment configuration - single source of truth
export const getConfig = () => {
  if (ENV.DEBUG_MODE) {
    console.log('[Config] Using environment configuration:', {
      ENVIRONMENT: ENV.ENVIRONMENT,
      BASE_URL: ENV.API_BASE_URL,
      IS_DEV: ENV.IS_DEV,
      IS_PRODUCTION: ENV.IS_PRODUCTION,
    });
  }

  return {
    ...API_CONFIG,
    BASE_URL: ENV.API_BASE_URL,
    DEBUG: ENV.DEBUG_MODE,
    ENVIRONMENT: ENV.ENVIRONMENT,
  };
};
