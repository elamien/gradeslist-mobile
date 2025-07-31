import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { TamaguiProvider } from 'tamagui';
import { config } from '../tamagui.config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { initializeCredentials } from '../store/useAppStore';
import { NotificationService } from '../services/notificationService';
import { databaseService } from '../services/databaseService';
import { CustomSplashScreen } from '../components/SplashScreen';

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

  const [isAppReady, setIsAppReady] = useState(false);
  const appFadeAnim = useRef(new Animated.Value(0)).current;

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

    // Simple timer: show splash for 3 seconds then transition
    setTimeout(() => {
      console.log('Splash screen timer completed - triggering fade transition');
      setIsAppReady(true);
      
      // Start fade in animation for main app
      Animated.timing(appFadeAnim, {
        toValue: 1,
        duration: 500, // 500ms fade in
        useNativeDriver: true,
      }).start();
    }, 3000);
    
  }, []);

  if (!isAppReady) {
    return <CustomSplashScreen />;
  }

  return (
    <Animated.View style={{ flex: 1, opacity: appFadeAnim }}>
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
    </Animated.View>
  );
}
