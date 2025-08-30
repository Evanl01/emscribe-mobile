import Constants from 'expo-constants';

// Environment configuration helper
export const ENV = {
  // Supabase configuration
  SUPABASE_URL: Constants.expoConfig?.extra?.SUPABASE_URL,
  SUPABASE_ANON_KEY: Constants.expoConfig?.extra?.SUPABASE_ANON_KEY,
  
  // API configuration
  API_BASE_URL: Constants.expoConfig?.extra?.API_BASE_URL,
  
  // Environment detection
  NODE_ENV: Constants.expoConfig?.extra?.NODE_ENV,
  IS_DEV: __DEV__,
  IS_PRODUCTION: Constants.expoConfig?.extra?.NODE_ENV === 'production' || !__DEV__,
};

// Debug function to log environment variables (only in development)
export const debugEnvironment = () => {
  if (__DEV__) {
    console.log('[Environment] Configuration loaded:', {
      SUPABASE_URL: ENV.SUPABASE_URL ? '✅ Present' : '❌ Missing',
      SUPABASE_ANON_KEY: ENV.SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing',
      API_BASE_URL: ENV.API_BASE_URL ? '✅ Present' : '❌ Missing',
      NODE_ENV: ENV.NODE_ENV || 'undefined',
      IS_DEV: ENV.IS_DEV,
      IS_PRODUCTION: ENV.IS_PRODUCTION,
      expoConfig: !!Constants.expoConfig,
      extra: !!Constants.expoConfig?.extra,
    });
    
    if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
      console.warn('[Environment] ⚠️ Missing required environment variables!');
      console.log('[Environment] Make sure your app.config.js has the correct values in the extra section');
    }
  }
};

export default ENV;
