import { Tabs } from 'expo-router';

export default function YearbookTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Members' }} />
      <Tabs.Screen name="prompts" options={{ title: 'Prompts' }} />
      <Tabs.Screen name="polls" options={{ title: 'Polls' }} />
      <Tabs.Screen name="superlatives" options={{ title: 'Superlatives' }} />
      <Tabs.Screen name="travels" options={{ title: 'Travels' }} />
    </Tabs>
  );
}
