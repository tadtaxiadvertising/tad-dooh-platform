import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/useAuthStore';
import { initDatabase } from '../src/lib/database';
import { initNotificationEngine } from '../src/lib/notificationEngine';
import { NotificationProvider } from '../src/contexts/NotificationContext';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
    void initNotificationEngine();

    // Hydrate auth state from SQLite
    const authStore = useAuthStore.getState();
    const { readAuthValue } = require('../src/lib/database');
    const token = readAuthValue('tad_driver_token');
    const userRaw = readAuthValue('tad_driver_user');
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw);
        authStore.login(token, user.entityId, user.name);
      } catch { /* corrupted cache */ }
    }
  }, []);

  return (
    <NotificationProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="update-password" />
        <Stack.Screen name="auth/callback" />
      </Stack>
    </NotificationProvider>
  );
}
