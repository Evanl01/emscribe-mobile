import Constants from 'expo-constants';

// Import build config (generated at build time)
let buildConfig = null;
try {
  buildConfig = require('./build-config.js').BUILD_CONFIG;
  console.log('� RUNTIME INIT - buildConfig loaded:', buildConfig);
} catch (error) {
  console.warn('❌ RUNTIME INIT - Could not load build-config.js:', error.message);
}

// Fallback configuration from bundled config file
let fallbackConfig = null;
try {
  fallbackConfig = require('../../assets/config.json');
  console.log('� RUNTIME INIT - fallbackConfig loaded:', fallbackConfig);
} catch (error) {
  console.warn('❌ RUNTIME INIT - Could not load fallback config.json:', error.message);
}

// Log what Constants provides immediately
console.log('🚀 RUNTIME INIT - Constants.expoConfig?.extra:', Constants.expoConfig?.extra);

// Runtime environment helper - reads from build-time configuration
// Priority: buildConfig (JS) → Constants.expoConfig.extra → fallbackConfig (JSON) → defaults
export const ENV = {
  // API Configuration - with multiple fallbacks
  API_BASE_URL: (() => {
    const value = buildConfig?.API_BASE_URL || Constants.expoConfig?.extra?.API_BASE_URL || fallbackConfig?.API_BASE_URL || 'http://10.23.90.75:3000/api';
    const source = buildConfig?.API_BASE_URL ? 'buildConfig' : Constants.expoConfig?.extra?.API_BASE_URL ? 'Constants.extra' : fallbackConfig?.API_BASE_URL ? 'fallbackConfig' : 'default';
    console.log(`🎯 API_BASE_URL from ${source}:`, value);
    return value;
  })(),
  
  // Supabase Configuration  
  SUPABASE_URL: buildConfig?.SUPABASE_URL || Constants.expoConfig?.extra?.SUPABASE_URL || fallbackConfig?.SUPABASE_URL || 'https://rwadtdxagmdqrygltzlv.supabase.co',
  SUPABASE_ANON_KEY: buildConfig?.SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || fallbackConfig?.SUPABASE_ANON_KEY,
  
  // Environment Detection - with fallbacks
  ENVIRONMENT: (() => {
    const value = buildConfig?.ENVIRONMENT || Constants.expoConfig?.extra?.ENVIRONMENT || fallbackConfig?.ENVIRONMENT || 'development';
    const source = buildConfig?.ENVIRONMENT ? 'buildConfig' : Constants.expoConfig?.extra?.ENVIRONMENT ? 'Constants.extra' : fallbackConfig?.ENVIRONMENT ? 'fallbackConfig' : 'default';
    console.log(`🎯 ENVIRONMENT from ${source}:`, value);
    return value;
  })(),
  DEBUG_MODE: (() => {
    const value = buildConfig?.DEBUG_MODE ?? Constants.expoConfig?.extra?.DEBUG_MODE ?? fallbackConfig?.DEBUG_MODE ?? true;
    const source = buildConfig?.DEBUG_MODE !== undefined ? 'buildConfig' : Constants.expoConfig?.extra?.DEBUG_MODE !== undefined ? 'Constants.extra' : fallbackConfig?.DEBUG_MODE !== undefined ? 'fallbackConfig' : 'default';
    console.log(`🎯 DEBUG_MODE from ${source}:`, value);
    return value;
  })(),
  
  // Build timestamp for debugging
  BUILD_TIMESTAMP: buildConfig?.BUILD_TIMESTAMP || fallbackConfig?.BUILD_TIMESTAMP || 'unknown',
  
  // Computed Environment Flags
  get IS_DEV() { 
    return this.ENVIRONMENT === 'development'; 
  },
  get IS_PROD() { 
    return this.ENVIRONMENT === 'production'; 
  },
  get IS_STAGING() { 
    return this.ENVIRONMENT === 'staging'; 
  },
};

// Debug function - only logs in debug mode
export const debugEnvironment = () => {
  // TEMPORARY: Always log for debugging (remove after verification)
  console.log('🔍 RUNTIME - Environment Check:', {
    ENVIRONMENT: ENV.ENVIRONMENT,
    API_BASE_URL: ENV.API_BASE_URL,
    DEBUG_MODE: ENV.DEBUG_MODE,
    IS_DEV: ENV.IS_DEV,
    IS_PROD: ENV.IS_PROD,
    BUILD_TIMESTAMP: ENV.BUILD_TIMESTAMP,
  });
  
  console.log('🔍 RUNTIME - Sources:', {
    'buildConfig (JS)': buildConfig || 'NOT AVAILABLE',
    'Constants.expoConfig.extra': Constants.expoConfig?.extra || 'NOT AVAILABLE',
    'fallbackConfig (JSON)': fallbackConfig || 'NOT AVAILABLE',
  });
  
  if (ENV.DEBUG_MODE) {
    console.log('[Environment] Configuration loaded:', {
      ENVIRONMENT: ENV.ENVIRONMENT,
      API_BASE_URL: ENV.API_BASE_URL ? '✅ Present' : '❌ Missing',
      SUPABASE_URL: ENV.SUPABASE_URL ? '✅ Present' : '❌ Missing', 
      SUPABASE_ANON_KEY: ENV.SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing',
      DEBUG_MODE: ENV.DEBUG_MODE,
      IS_DEV: ENV.IS_DEV,
      IS_PROD: ENV.IS_PROD,
    });
    
    if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY || !ENV.API_BASE_URL) {
      console.warn('[Environment] ⚠️ Missing required environment variables!');
      console.log('[Environment] Check your app.config.js configuration');
    }
  }
};

export default ENV;
