const fs = require('fs');
const path = require('path');

// Read environment
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

const config = {
  ...envConfig[environment],
  ENVIRONMENT: environment,
  BUILD_TIMESTAMP: new Date().toISOString(),
  SUPABASE_URL: 'https://rwadtdxagmdqrygltzlv.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YWR0ZHhhZ21kcXJ5Z2x0emx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYxODQsImV4cCI6MjA2ODYyMjE4NH0.a4dAU6510fuSihMYqGu4tyZHanGVETweKQKsgezIF1Y',
};

// Write config to src/utils (as JavaScript, not JSON)
const configDir = path.join(__dirname, 'src/utils');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

const jsContent = `// Auto-generated config file - DO NOT EDIT MANUALLY
// Generated at: ${new Date().toISOString()}
// Environment: ${environment}

export const BUILD_CONFIG = ${JSON.stringify(config, null, 2)};

export default BUILD_CONFIG;
`;

fs.writeFileSync(
  path.join(configDir, 'build-config.js'), 
  jsContent
);

// Also write JSON for reference
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(assetsDir, 'config.json'), 
  JSON.stringify(config, null, 2)
);

console.log(`📝 Config written to src/utils/build-config.js for ${environment} environment`);
console.log(`📄 Config contents:`, JSON.stringify(config, null, 2));
