import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import * as SplashScreen from 'expo-splash-screen';

interface SplashScreenProps {
  onAnimationFinish?: () => void;
  shouldFadeOut?: boolean;
}

const { width, height } = Dimensions.get('window');

export function CustomSplashScreen({ onAnimationFinish, shouldFadeOut }: SplashScreenProps) {
  const animationRef = useRef<LottieView>(null);
  const [hasFinished, setHasFinished] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('CustomSplashScreen mounted');
    
    // Keep the native splash screen visible while we prepare the custom one
    const prepare = async () => {
      try {
        // Keep splash screen visible
        await SplashScreen.preventAutoHideAsync();
        console.log('Native splash screen prevented from auto-hiding');
      } catch (e) {
        console.warn('Error preventing splash screen auto-hide:', e);
      }
    };

    prepare();

    // Fallback timer in case animation doesn't trigger onAnimationFinish
    const fallbackTimer = setTimeout(() => {
      console.log('Fallback timer triggered - finishing splash screen');
      handleAnimationFinish();
    }, 4000); // 4 seconds fallback

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleAnimationFinish = () => {
    if (hasFinished) return; // Prevent multiple calls
    
    console.log('Animation finished - starting fade out');
    setHasFinished(true);
    
    // Start fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500, // 500ms fade out
      useNativeDriver: true,
    }).start(() => {
      console.log('Fade out complete - transitioning to main app');
      // Hide the native splash screen and call the callback
      SplashScreen.hideAsync();
      onAnimationFinish?.();
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LottieView
        ref={animationRef}
        source={require('../assets/gradein-loading.json')}
        autoPlay
        loop={true}
        style={styles.fullScreenAnimation}
        onLoad={() => console.log('Lottie animation loaded')}
        onError={(error) => console.error('Lottie error:', error)}
        speed={1.5}
        hardwareAccelerationAndroid
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenAnimation: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
});