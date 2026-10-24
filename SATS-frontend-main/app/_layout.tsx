import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useNavigationContainerRef, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '../contexts/AuthContext';
import React from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const navigationRef = useNavigationContainerRef();
  const router = useRouter();

  // Handle deep linking for NFC scans
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      console.log('Deep link received:', url);
      
      // Ignore development/expo URLs
      if (url.includes('exp://') || url.includes('localhost') || url.includes('192.168')) {
        console.log('Ignoring development URL');
        return;
      }
      
      // Parse the deep link URL
      const parsed = Linking.parse(url);
      console.log('Parsed URL:', parsed);
      
      // Extract hostname and path
      // Format: sats://room/id or sats://asset/id
      const hostname = parsed.hostname || '';
      const pathParam = parsed.path || '';
      
      console.log('Hostname:', hostname, 'Path:', pathParam);
      
      // Handle room deep links
      if ((hostname === 'room' || hostname === 'r') && pathParam) {
        const roomId = pathParam.split('?')[0];
        if (roomId) {
          console.log('Navigating to room:', roomId);
          router.push(`/room-detail/${roomId}`);
          return;
        }
      }
      
      // Handle asset deep links
      if ((hostname === 'asset' || hostname === 'a') && pathParam) {
        const assetId = pathParam.split('?')[0];
        if (assetId) {
          console.log('Navigating to asset:', assetId);
          router.push(`/asset-detail/${assetId}`);
          return;
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle initial URL (app opened from deep link)
    const getInitialUrl = async () => {
      const url = await Linking.getInitialURL();
      if (url != null) {
        handleDeepLink({ url });
      }
    };

    getInitialUrl();

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack ref={navigationRef}>
          <Stack.Screen name="splash" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="room-detail/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="asset-detail/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="edit-asset/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="edit-room/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="create-asset" options={{ headerShown: false }} />
          <Stack.Screen name="create-room" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
