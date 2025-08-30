# EmScribe Mobile

A mobile iOS app for transcribing patient encounters using React Native and Expo.

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
