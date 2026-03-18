import { Tabs } from 'expo-router';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/src/contexts/ThemeContext';
import { DSIcon, SafeAreaTabBar, TAB_BAR_CONTENT_HEIGHT } from '@/src/design-system';

function YearbookTabBar(props: BottomTabBarProps) {
  return <SafeAreaTabBar {...props} mode="yearbook" />;
}

export default function YearbookTabsLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <YearbookTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          height: TAB_BAR_CONTENT_HEIGHT,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Members',
          tabBarLabel: 'Crew',
          tabBarAccessibilityLabel: 'Members tab',
          tabBarIcon: ({ color, focused }) => (
            <DSIcon name={{ ios: focused ? 'person.2.fill' : 'person.2', android: 'people', web: 'people' }} color={color} size={20} />
          ),
        }}
      />
      <Tabs.Screen
        name="prompts"
        options={{
          title: 'Prompts',
          tabBarLabel: 'Prompts',
          tabBarAccessibilityLabel: 'Prompts',
          tabBarIcon: ({ color, focused }) => (
            <DSIcon name={{ ios: focused ? 'quote.bubble.fill' : 'quote.bubble', android: 'chat', web: 'chat' }} color={color} size={20} />
          ),
        }}
      />
      <Tabs.Screen
        name="polls"
        options={{
          title: 'Polls',
          tabBarLabel: 'Polls',
          tabBarAccessibilityLabel: 'Polls',
          tabBarIcon: ({ color, focused }) => (
            <DSIcon name={{ ios: focused ? 'chart.bar.fill' : 'chart.bar', android: 'bar_chart', web: 'bar_chart' }} color={color} size={20} />
          ),
        }}
      />
      <Tabs.Screen
        name="superlatives"
        options={{
          title: 'Superlatives',
          tabBarLabel: 'Awards',
          tabBarAccessibilityLabel: 'Superlatives tab',
          tabBarIcon: ({ color, focused }) => (
            <DSIcon name={{ ios: focused ? 'trophy.fill' : 'trophy', android: 'emoji_events', web: 'emoji_events' }} color={color} size={20} />
          ),
        }}
      />
      <Tabs.Screen
        name="travels"
        options={{
          title: 'Travels',
          tabBarLabel: 'Trips',
          tabBarAccessibilityLabel: 'Travels tab',
          tabBarIcon: ({ color, focused }) => (
            <DSIcon name={{ ios: focused ? 'map.fill' : 'map', android: 'map', web: 'map' }} color={color} size={20} />
          ),
        }}
      />
    </Tabs>
  );
}
