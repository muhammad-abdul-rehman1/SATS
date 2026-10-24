import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../contexts/AuthContext';
import { ensureApiReachable } from '../services/api';

// Keep the splash screen visible
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function SplashScreenComponent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const runSplashSequence = async () => {
      try {
        await SplashScreen.hideAsync();

        // Warm up server discovery in the background so login connects instantly.
        ensureApiReachable().catch(() => {});

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();

        // Wait for both the minimum display time and auth state to resolve
        await new Promise(resolve => setTimeout(resolve, 2000));

        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();

        await new Promise(resolve => setTimeout(resolve, 400));

        router.replace(isAuthenticated ? '/(tabs)/assets' : '/login');
      } catch (error) {
        console.error('Splash error:', error);
        router.replace('/login');
      }
    };

    // Only start the sequence once auth loading is done
    if (!authLoading) {
      runSplashSequence();
    }
  }, [authLoading, isAuthenticated, router, fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        {/* Decorative circles */}
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />

        {/* Content */}
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Logo Container */}
          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/images/sats.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* App Title */}
          <Text style={styles.title}>Smart Asset Tracker</Text>
          <Text style={styles.subtitle}>Track. Locate. Manage.</Text>

          {/* Loading Indicator */}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading App...</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  background: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.06,
  },
  circle1: {
    width: 500,
    height: 500,
    backgroundColor: '#007AFF',
    top: -200,
    right: -150,
  },
  circle2: {
    width: 400,
    height: 400,
    backgroundColor: '#007AFF',
    bottom: -150,
    left: -100,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoWrapper: {
    width: 140,
    height: 140,
    borderRadius: 35,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 60,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
