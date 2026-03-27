import { useTheme } from '@/src/contexts/ThemeContext';
import { AppBackButton, NavFadeBar } from '@/src/design-system';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_CONTENT_HEIGHT = 44;

export default function AppLayout() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        header: ({ options, route, navigation, back }) => {
          const title =
            typeof options.title === 'string' && options.title.trim().length > 0
              ? options.title
              : route.name;
          return (
            <View style={[styles.customHeader, { height: headerHeight }]} pointerEvents="box-none">
              <NavFadeBar edge="top" />
              <View style={[styles.customHeaderInner, { paddingTop: insets.top }]}>
                <View style={styles.customHeaderRow}>
                  <View style={[styles.headerSide, styles.headerSideLeft]}>
                    {back ? (
                      <AppBackButton
                        accessibilityLabel="Go back"
                        onPress={() => {
                          if (navigation.canGoBack()) {
                            navigation.goBack();
                            return;
                          }
                          router.replace('/(app)');
                        }}
                      />
                    ) : null}
                  </View>
                  <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {title}
                  </Text>
                  <View style={styles.headerSide} />
                </View>
              </View>
            </View>
          );
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="yearbook/create"
        options={{ headerShown: true, title: 'Create yearbook' }}
      />
      <Stack.Screen
        name="yearbook/join"
        options={{ headerShown: true, title: 'Join yearbook' }}
      />
      <Stack.Screen
        name="yearbook/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="profile/[userId]"
        options={{ headerShown: true, title: 'Profile' }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{ headerShown: true, title: 'Edit profile' }}
      />
      <Stack.Screen
        name="ideas/[slug]"
        options={{ headerShown: true, title: 'Ideas' }}
      />
      <Stack.Screen name="testing/database" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  customHeaderInner: {},
  customHeaderRow: {
    height: HEADER_CONTENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  headerSide: {
    width: 104,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSideLeft: {
    justifyContent: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 8,
  },
});
