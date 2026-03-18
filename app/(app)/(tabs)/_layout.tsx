import { Tabs, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { DSIcon, NavFadeBar, NavIconButton } from '@/src/design-system';

export default function AppTabsLayout() {
  const { theme } = useTheme();
  const router = useRouter();

  const headerLeft = () => (
    <View style={{ paddingLeft: 8 }}>
      <NavIconButton
        accessibilityLabel="Back to home"
        onPress={() => router.replace('/(app)')}
        icon={<DSIcon name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={20} color={theme.colors.text} />}
      />
    </View>
  );

  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerBackground: () => <NavFadeBar edge="top" />,
        headerTransparent: true,
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '700',
          color: theme.colors.text,
        },
        headerTintColor: theme.colors.text,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: true,
          headerLeft,
          headerBackVisible: false,
        }}
      />
    </Tabs>
  );
}
