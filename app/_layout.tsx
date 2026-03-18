import { MaterialIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/src/contexts/ThemeContext';
import { TamaguiProvider } from 'tamagui';
import { config } from '@/src/design-system';
import { logger } from '@/src/utils/logger';

const JOIN_PREFIX = 'yearbook://join/';
function parseJoinCode(url: string | null): string | null {
  if (!url || !url.startsWith(JOIN_PREFIX)) return null;
  return url.slice(JOIN_PREFIX.length).trim() || null;
}

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { authState } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  logger.debug('Nav', 'authState', { authState, segment0: segments[0] });

  if (authState === 'loading') {
    return null;
  }

  const inAuthGroup = segments[0] === '(auth)';
  const inOnboardingGroup = segments[0] === '(onboarding)';
  const inAppGroup = segments[0] === '(app)';

  if (authState === 'unauthenticated' && !inAuthGroup) {
    logger.info('Nav', 'Redirect unauthenticated → (auth)/phone');
    return <Redirect href="/(auth)/phone" />;
  }
  if (authState === 'onboarding' && !inOnboardingGroup) {
    logger.info('Nav', 'Redirect onboarding → (onboarding)/welcome');
    return <Redirect href="/(onboarding)/welcome" />;
  }
  if (authState === 'authenticated' && (inAuthGroup || inOnboardingGroup)) {
    logger.info('Nav', 'Redirect authenticated → (app)');
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...MaterialIcons.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <TamaguiProviderWrapper>
          <AuthProvider>
            <StatusBar style="dark" />
            <DeepLinkHandler />
            <RootLayoutNav />
          </AuthProvider>
        </TamaguiProviderWrapper>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function TamaguiProviderWrapper({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useTheme();
  return (
    <TamaguiProvider config={config} defaultTheme={colorScheme}>
      {children}
    </TamaguiProvider>
  );
}

function DeepLinkHandler() {
  const { setPendingJoinCode } = useAuth();
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      const code = parseJoinCode(url);
      if (code) setPendingJoinCode(code);
    });
    const sub = Linking.addEventListener('url', (e) => {
      const code = parseJoinCode(e.url);
      if (code) setPendingJoinCode(code);
    });
    return () => sub.remove();
  }, [setPendingJoinCode]);
  return null;
}
