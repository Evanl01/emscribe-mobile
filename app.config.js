// Environment configuration - single source of truth
const environment = process.env.NODE_ENV || 'development';

const envConfig = {
  development: {
    API_BASE_URL: 'http://10.23.90.75:3000/api',
    DEBUG_MODE: true,
  },
  production: {
    API_BASE_URL: 'https://emscribe.vercel.app/api', 
    DEBUG_MODE: false,
  }
};

// Debug: Log the environment and API URL during build
console.log(`🔧 BUILD TIME - Environment: ${environment}`);
console.log(`🔧 BUILD TIME - API_BASE_URL: ${envConfig[environment].API_BASE_URL}`);

export default {
  expo: {
    name: 'Enscribe',
    slug: 'enscribe-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/emscribe-icon128.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/emscribe-icon128.png', // Updated to use the Enscribe icon
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.enscribe.app', // Updated to match the App Store Connect record
      infoPlist: {
        NSMicrophoneUsageDescription: 'This app needs microphone access to record patient encounters.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/emscribe-icon128.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: 'com.enscribe.app.001', // Ensure this matches your Android application ID
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-secure-store'],
    scheme: 'enscribe',
    extra: {
      // Environment-specific configuration
      ...envConfig[environment],
      ENVIRONMENT: environment,
      
      // Supabase configuration
      SUPABASE_URL: 'https://rwadtdxagmdqrygltzlv.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YWR0ZHhhZ21kcXJ5Z2x0emx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYxODQsImV4cCI6MjA2ODYyMjE4NH0.a4dAU6510fuSihMYqGu4tyZHanGVETweKQKsgezIF1Y',
      
      // EAS Build configuration
      eas: {
        projectId: '3651b250-fe25-4a3d-878a-2a59094454e2',
      },
    },
  },
};
