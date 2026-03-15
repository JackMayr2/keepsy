import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
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
