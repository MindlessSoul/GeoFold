import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { C, Fonts } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { SyncProvider } from '@/lib/sync-context';

// Rejects if the splash has already gone; that is not a reason to take the app down.
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  // `loading` is guaranteed to clear (see lib/auth), but this renders the app background rather
  // than nothing so a stall shows a screen, not a void.
  if (loading) return <View style={{ flex: 1, backgroundColor: C.surface }} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.surface },
        // Detail screens carry the design's own header, so the native one stays off throughout.
        headerTitleStyle: { fontFamily: Fonts.sans },
      }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="capture" options={{ animation: 'fade' }} />
        <Stack.Screen name="sync" />
        <Stack.Screen name="project/[id]" />
        <Stack.Screen name="project/new" />
        <Stack.Screen name="survey/[id]" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="signin" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SyncProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </SyncProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
