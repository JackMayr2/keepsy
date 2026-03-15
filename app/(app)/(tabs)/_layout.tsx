import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6D28D9',
        tabBarInactiveTintColor: '#A8A29E',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F5F5F4',
          borderTopWidth: 1,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#F8F6F4',
          borderBottomColor: '#F5F5F4',
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#1C1917',
        },
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="drafts"
        options={{
          title: 'Drafts',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'doc.text', android: 'document', web: 'document' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
