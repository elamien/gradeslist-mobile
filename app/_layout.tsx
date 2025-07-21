import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { TamaguiProvider } from 'tamagui';
import { config } from '../tamagui.config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { initializeCredentials } from '../store/useAppStore';
import { NotificationService } from '../services/notificationService';
import { databaseService } from '../services/databaseService';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error) => {
          // Don't retry on 401/403 errors
          if (error && 'status' in error && (error.status === 401 || error.status === 403)) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  }));

  // Initialize credentials, database, and notifications when app starts
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database first
        await databaseService.initialize();
        console.log('Database initialized');
        
        // Initialize credentials
        await initializeCredentials();
        console.log('Credentials initialized');
        
        // Set up notification listeners (don't auto-enable notifications)
        NotificationService.setupNotificationListeners();
        console.log('Notification service initialized');
        
        console.log('App initialization complete');
      } catch (error) {
        console.error('App initialization error:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config}>
        <ThemeProvider value={DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </TamaguiProvider>
    </QueryClientProvider>
  );
}
