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
      // Environment Configuration
      SUPABASE_URL: 'https://rwadtdxagmdqrygltzlv.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YWR0ZHhhZ21kcXJ5Z2x0emx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYxODQsImV4cCI6MjA2ODYyMjE4NH0.a4dAU6510fuSihMYqGu4tyZHanGVETweKQKsgezIF1Y',
      API_BASE_URL: 'http://192.168.0.107:3000/api',
      NODE_ENV: __DEV__ ? 'development' : 'production',
      // EAS Build environment detection
      eas: {
        projectId: 'your-project-id', // You can add this later if using EAS Build
      },
    },
  },
};
