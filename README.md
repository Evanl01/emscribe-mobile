# Enscribe

Ambient Listening of Medical Patient Encounters to be transcribed and summarized into a note (SOAP note, BIRP note, Progress note...).  

Per HIPAA compliance, all steps of the app are designed to protect patient's Protected Health Information. Any PHI patient data is transmitted via HTTPS to ensure encryption in transit, and also encrypted before storing in database.

## 🏗️ Configuration Architecture

This app uses a multi-layered configuration system to ensure environment settings work correctly across development, production, and native builds.

### 📋 Configuration Flow & Reading Order

#### **🚀 Phase 1: Build Time (Script Execution)**

**Step 1: 📦 [`package.json`](package.json) Scripts**
```bash
npm run xcode:prod
# Executes: cross-env NODE_ENV=production node generate-config.js && expo prebuild --clean
```
- Sets `NODE_ENV=production` environment variable
- Triggers configuration generation

**Step 2: 🔧 [`generate-config.js`](generate-config.js)**
```javascript
const environment = process.env.NODE_ENV || 'development';
```
- ✅ **Reads**: `process.env.NODE_ENV` (from package.json script)
- ✅ **Uses**: Internal `envConfig` object with environment-specific settings
- ✅ **Writes**: Creates `📄 src/utils/build-config.js` with resolved configuration

**Step 3: ⚙️ [`app.config.js`](app.config.js)**
```javascript
const environment = process.env.NODE_ENV || 'development';
```
- ✅ **Reads**: Same `process.env.NODE_ENV` environment variable
- ✅ **Uses**: Own internal `envConfig` object (⚠️ **duplicate** of generate-config.js)
- ✅ **Purpose**: Configures Expo prebuild for native iOS/Android projects

---

#### **🏃 Phase 2: Runtime (App Execution)**

**Step 4: 🌐 [`src/utils/environment.js`](src/utils/environment.js)**
```javascript
// Priority-based configuration loading
const buildConfig = require('./build-config.js').BUILD_CONFIG;
```
**Reading Priority Chain:**
1. 🥇 **Primary**: `📄 build-config.js` (generated at build time)
2. 🥈 **Secondary**: `Constants.expoConfig.extra` (from app.config.js via Expo)
3. 🥉 **Fallback**: Hardcoded default values

**Step 5: 🔗 [`src/utils/config.js`](src/utils/config.js)**
```javascript
import { ENV } from './environment';
```
- ✅ **Reads**: ENV object from environment.js
- ✅ **Adds**: Static API endpoints and timeout configurations
- ✅ **Exports**: Combined configuration via `getConfig()` function

**Step 6: 📱 React Components**
```javascript
import { ENV } from '../utils/environment';  // Direct import
// OR
import { getConfig } from '../utils/config';  // Via config wrapper
```
- ✅ **Components**: Import either ENV directly or use getConfig()
- ✅ **Usage**: Access final resolved configuration values

---

### 🔄 Complete Data Flow Diagram

```
📦 package.json (NODE_ENV source)
     ↓ sets environment variable
🔧 generate-config.js 
     ↓ reads NODE_ENV, writes file
📄 build-config.js (generated)
     ↓ imported at runtime
🌐 environment.js (priority chain)
     ↓ creates ENV object
🔗 config.js (optional wrapper)
     ↓ adds API endpoints
📱 React Components
     ↓ import configuration
👤 User sees final config
```

**Parallel Expo Path:**
```
📦 package.json (NODE_ENV source)
     ↓ sets environment variable  
⚙️ app.config.js
     ↓ reads NODE_ENV
🏗️ expo prebuild
     ↓ configures native projects
📱 Native iOS/Android builds
```

---

### 🎯 Key Configuration Files

| File | Icon | Purpose | Reads From | Writes To |
|------|------|---------|------------|-----------|
| `package.json` | 📦 | Environment source | User commands | `NODE_ENV` variable |
| `generate-config.js` | 🔧 | Build-time config | `NODE_ENV` | `build-config.js` |
| `app.config.js` | ⚙️ | Expo configuration | `NODE_ENV` | Expo prebuild |
| `build-config.js` | 📄 | Generated runtime config | Generated file | JavaScript imports |
| `environment.js` | 🌐 | Runtime environment | `build-config.js` + fallbacks | ENV object |
| `config.js` | 🔗 | API configuration | `environment.js` | getConfig() function |
| React Components | 📱 | App interface | `environment.js` or `config.js` | User interface |

---

### 🔧 Environment Scripts

- **Development**: `npm run start:dev` - Uses local development API
- **Production**: `npm run start:prod` - Uses production API with Expo
- **Xcode Development**: `npm run xcode:dev` - Prepares development build for Xcode
- **Xcode Production**: `npm run xcode:prod` - Prepares production build for Xcode

---

## Features

- **Secure Authentication**: JWT token-based authentication with refresh token support
- **Token Security**: Access tokens stored in Expo SecureStore, user data in AsyncStorage
- **Auto Token Refresh**: Automatic token refresh when expired
- **Native iOS Design**: Optimized for iOS with native look and feel

## Getting Started

### Prerequisites

- Node.js (version 16 or later)
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Xcode) or physical iOS device with Expo Go

### Installation

1. Clone the repository and navigate to the project directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure API endpoints:
   - Edit `src/utils/config.js`
   - Update `BASE_URL` with your actual API server URL
   - For development, you can use a local server (e.g., `http://localhost:3000`)

### Running the App

#### Development
```bash
npm start
```

This will start the Expo development server. You can then:
- Press `i` to open iOS simulator
- Scan the QR code with your iPhone using the Expo Go app

#### Specific Platforms
```bash
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser
```

## API Integration

### Authentication Flow

The app expects your server to support the following API endpoint:

**POST /api/auth**
```json
{
  "action": "sign-in",
  "email": "user@example.com",
  "password": "password"
}
```

**Important**: The mobile app sends `Accept: application/json` header, which should make your server return:

```json
{
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token",
  "expires_at": "2024-01-01T00:00:00Z"
}
```

This is different from the web version which uses `Accept: text/html` for browser cookie-based authentication.

### Token Security

- **Access Tokens**: Stored in Expo SecureStore (iOS Keychain)
- **Refresh Tokens**: Stored in Expo SecureStore (iOS Keychain)
- **User Data**: Stored in AsyncStorage (non-sensitive data only)
- **Automatic Refresh**: Tokens are automatically refreshed when expired

## Project Structure

```
src/
├── context/
│   └── AuthContext.js          # Authentication state management
├── screens/
│   ├── LoginScreen.js          # Login interface
│   └── NewPatientEncounterScreen.js  # Main app screen
├── services/
│   └── AuthService.js          # API authentication service
└── utils/
    └── config.js               # Configuration settings
```

## Security Features

1. **Secure Token Storage**: Uses iOS Keychain via Expo SecureStore
2. **Token Validation**: Checks token expiry and validates with server
3. **Automatic Refresh**: Seamlessly refreshes expired tokens
4. **Secure Logout**: Clears all stored tokens and user data

## Configuration

### API Configuration

Edit `src/utils/config.js` to configure your API endpoints:

```javascript
export const API_CONFIG = {
  BASE_URL: 'https://your-api-domain.com',
  // ... other settings
};
```

### Environment-Specific Settings

The app automatically detects development vs production mode:
- **Development**: Uses local server (`http://localhost:3000`)
- **Production**: Uses production API URL

## Development Notes

### Backend Requirements

Your authentication server should:
1. Accept `Accept: application/json` header for mobile clients
2. Return both `access_token` and `refresh_token` in JSON response
3. Support token refresh endpoint for seamless user experience

### Authentication State

The app uses React Context for authentication state management:
- `isAuthenticated`: Boolean indicating if user is logged in
- `isLoading`: Boolean for showing loading states
- `user`: User information (email, etc.)
- `login(email, password)`: Login function
- `logout()`: Logout function

## Coming Soon

- Patient encounter transcription
- Audio recording and processing
- SOAP note generation
- Patient encounter history
- EMR system integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on iOS
5. Submit a pull request

## License

Private project - All rights reserved.
