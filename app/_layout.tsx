import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { TamaguiProvider } from 'tamagui';
import { databaseService } from '../services/databaseService';
import { NotificationService } from '../services/notificationService';
import { initializeCredentials } from '../store/useAppStore';
import { config } from '../tamagui.config';


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

    // Mark app as ready after initialization, but keep splash visible
    setTimeout(() => {
      console.log('App initialization complete - marking ready');
      setIsAppReady(true);
    }, 1000); // App ready early, but splash still controls transition
    
  }, []);

  // TODO: Fix splash screen animation later - temporarily disabled due to white screen issue
  // The CustomSplashScreen component exists but causes the app to get stuck on white screen
  // if (!isAppReady) {
  //   return <CustomSplashScreen onAnimationFinish={() => {
  //     console.log('Splash animation finished, showing main app');
  //     setShowSplash(false);
  //     // Fade in main app
  //     Animated.timing(appFadeAnim, {
  //       toValue: 1,
  //       duration: 300,
  //       useNativeDriver: true,
  //     }).start();
  //   }} />;
  // }

  // Set app to fully visible immediately
  useEffect(() => {
    if (isAppReady) {
      appFadeAnim.setValue(1);
    }
  }, [isAppReady, appFadeAnim]);

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
