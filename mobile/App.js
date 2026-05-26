import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DashboardScreen from './src/screens/mobile/DashboardScreen';
import DashboardDesktopScreen from './src/screens/desktop/DashboardDesktopScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ParcellesScreen from './src/screens/app/ParcellesScreen';
import ParcelleDetailScreen from './src/screens/app/ParcelleDetailScreen';
import AlertesScreen from './src/screens/app/AlertesScreen';
import AccountSettingsScreen from './src/screens/app/AccountSettingsScreen';
import CompanyScreen from './src/screens/app/CompanyScreen';
import { ToastProvider } from './src/context/ToastContext';
import ToastContainer from './src/components/ui/ToastContainer';
import { tokenStorage } from './src/services/api';
import { setLanguage } from './src/i18n';

const Stack = createStackNavigator();
const isWeb = Platform.OS === 'web';

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"    component={LoginScreen}    />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isWeb
        ? <Stack.Screen name="Dashboard" component={DashboardDesktopScreen} />
        : <Stack.Screen name="Dashboard" component={DashboardScreen} />
      }
      <Stack.Screen name="Parcelles"       component={ParcellesScreen}       />
      <Stack.Screen name="ParcelleDetail"  component={ParcelleDetailScreen}  />
      <Stack.Screen name="Alertes"         component={AlertesScreen}         />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <Stack.Screen name="Company"         component={CompanyScreen}         />
    </Stack.Navigator>
  );
}

export default function App() {
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'auth' | 'app'

  useEffect(() => {
    Promise.all([
      tokenStorage.get(),
      AsyncStorage.getItem('techfarm_language'),
    ]).then(([token, lang]) => {
      if (lang) setLanguage(lang);
      setAuthState(token ? 'app' : 'auth');
    });
  }, []);

  return (
    <ToastProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        {authState === 'loading' ? (
          <View style={{ flex: 1, backgroundColor: '#0f1923', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color="#2ecc71" size="large" />
          </View>
        ) : authState === 'app' ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="App"  component={AppStack}  />
            <Stack.Screen name="Auth" component={AuthStack} />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Auth" component={AuthStack} />
            <Stack.Screen name="App"  component={AppStack}  />
          </Stack.Navigator>
        )}
      </NavigationContainer>
      <ToastContainer />
    </ToastProvider>
  );
}

