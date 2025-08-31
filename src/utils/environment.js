import Constants from 'expo-constants';

// Runtime environment helper - reads from build-time configuration
// Configuration is defined in app.config.js (single source of truth)
export const ENV = {
  // API Configuration
  API_BASE_URL: Constants.expoConfig?.extra?.API_BASE_URL,
  
  // Supabase Configuration  
  SUPABASE_URL: Constants.expoConfig?.extra?.SUPABASE_URL,
  SUPABASE_ANON_KEY: Constants.expoConfig?.extra?.SUPABASE_ANON_KEY,
  
  // Environment Detection
  ENVIRONMENT: Constants.expoConfig?.extra?.ENVIRONMENT || 'development',
  DEBUG_MODE: Constants.expoConfig?.extra?.DEBUG_MODE || false,
  
  // Computed Environment Flags
  get IS_DEV() { 
    return this.ENVIRONMENT === 'development'; 
  },
  get IS_PRODUCTION() { 
    return this.ENVIRONMENT === 'production'; 
  },
  get IS_STAGING() { 
    return this.ENVIRONMENT === 'staging'; 
  },
};

// Debug function - only logs in debug mode
export const debugEnvironment = () => {
  if (ENV.DEBUG_MODE) {
    console.log('[Environment] Configuration loaded:', {
      ENVIRONMENT: ENV.ENVIRONMENT,
      API_BASE_URL: ENV.API_BASE_URL ? '✅ Present' : '❌ Missing',
      SUPABASE_URL: ENV.SUPABASE_URL ? '✅ Present' : '❌ Missing', 
      SUPABASE_ANON_KEY: ENV.SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing',
      DEBUG_MODE: ENV.DEBUG_MODE,
      IS_DEV: ENV.IS_DEV,
      IS_PRODUCTION: ENV.IS_PRODUCTION,
    });
    
    if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY || !ENV.API_BASE_URL) {
      console.warn('[Environment] ⚠️ Missing required environment variables!');
      console.log('[Environment] Check your app.config.js configuration');
    }
  }
};

export default ENV;
