import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import NewPatientEncounterScreen from './src/screens/NewPatientEncounterScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { debugEnvironment } from './src/utils/environment';

// Debug environment variables on app startup
debugEnvironment();

const Stack = createStackNavigator();

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: false 
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen 
            name="NewPatientEncounter" 
            component={NewPatientEncounterScreen} 
          />
        ) : (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}
