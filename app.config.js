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

export default {
  expo: {
    name: 'EmScribe Mobile',
    slug: 'emscribe-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.emscribe.mobile',
      infoPlist: {
        NSMicrophoneUsageDescription: 'This app needs microphone access to record patient encounters.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: 'com.emscribe.mobile',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-secure-store'],
    scheme: 'emscribe',
    extra: {
      // Environment-specific configuration
      ...envConfig[environment],
      ENVIRONMENT: environment,
      
      // Supabase configuration
      SUPABASE_URL: 'https://rwadtdxagmdqrygltzlv.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YWR0ZHhhZ21kcXJ5Z2x0emx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYxODQsImV4cCI6MjA2ODYyMjE4NH0.a4dAU6510fuSihMYqGu4tyZHanGVETweKQKsgezIF1Y',
      
      // EAS Build configuration
      eas: {
        projectId: 'your-project-id', // Add this later if using EAS Build
      },
    },
  },
};
