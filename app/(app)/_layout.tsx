import { Stack } from 'expo-router';
import { useTheme } from '@/src/contexts/ThemeContext';
import { NavFadeBar } from '@/src/design-system';

export default function AppLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTransparent: true,
        headerBackground: () => <NavFadeBar edge="top" />,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
        headerTintColor: theme.colors.text,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="yearbook/create"
        options={{ headerShown: true, title: 'Create yearbook', headerBackTitle: 'Home' }}
      />
      <Stack.Screen
        name="yearbook/join"
        options={{ headerShown: true, title: 'Join yearbook', headerBackTitle: 'Home' }}
      />
      <Stack.Screen
        name="yearbook/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="profile/[userId]"
        options={{ headerShown: true, title: 'Profile', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{ headerShown: true, title: 'Edit profile', headerBackTitle: 'Settings' }}
      />
      <Stack.Screen name="testing/database" />
    </Stack>
  );
}
