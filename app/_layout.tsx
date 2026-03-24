import 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/src/contexts/ThemeContext';
import { TamaguiProvider } from 'tamagui';
import { config, DeferredFullscreenLoader } from '@/src/design-system';
import { logger } from '@/src/utils/logger';

const JOIN_PREFIX = 'yearbook://join/';
function parseJoinCode(url: string | null): string | null {
  if (!url || !url.startsWith(JOIN_PREFIX)) return null;
  const raw = url.slice(JOIN_PREFIX.length).trim();
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { authState } = useAuth();
  const { theme } = useTheme();
  const segments = useSegments();

  logger.debug('Nav', 'authState', { authState, segment0: segments[0] });

  if (authState === 'loading') {
    return (
      <View
        style={[styles.bootLoader, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Signing in"
      >
        <DeferredFullscreenLoader active accessibilityLabel="Signing in" />
      </View>
    );
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

function FontsAndApp({ loaded, error }: { loaded: boolean; error: Error | null }) {
  const { theme } = useTheme();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={[styles.bootLoader, { backgroundColor: theme.colors.background }]}>
        <DeferredFullscreenLoader active accessibilityLabel="Loading Keepsy" />
      </View>
    );
  }

  return (
    <TamaguiProviderWrapper>
      <AuthProvider>
        <DeepLinkHandler />
        <RootLayoutNav />
      </AuthProvider>
    </TamaguiProviderWrapper>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...MaterialIcons.font,
  });

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <ThemeProvider>
          <KeyboardRoot>
            <FontsAndApp loaded={loaded} error={error} />
          </KeyboardRoot>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function KeyboardRoot({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }
  return <KeyboardProvider>{children}</KeyboardProvider>;
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  bootLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

function TamaguiProviderWrapper({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useTheme();
  return (
    <TamaguiProvider config={config} defaultTheme={colorScheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
