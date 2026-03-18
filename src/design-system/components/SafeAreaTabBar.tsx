import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/contexts/ThemeContext';
import { TAB_BAR_CONTENT_HEIGHT } from '../constants/tabBar';

type SafeAreaTabBarMode = 'app' | 'yearbook';

type SafeAreaTabBarProps = BottomTabBarProps & {
  mode?: SafeAreaTabBarMode;
};

function getLabel(options: BottomTabBarProps['descriptors'][string]['options'], routeName: string) {
  const { tabBarLabel, title } = options;

  if (typeof tabBarLabel === 'string') {
    return tabBarLabel;
  }

  if (typeof title === 'string') {
    return title;
  }

  return routeName;
}

export function SafeAreaTabBar({
  state,
  descriptors,
  navigation,
  mode = 'app',
}: SafeAreaTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme, theme } = useTheme();
  const isDense = mode === 'yearbook' || state.routes.length > 4;
  const bottomInset = Math.max(insets.bottom, 10);

  const panelBackground = colorScheme === 'dark'
    ? 'rgba(11, 16, 48, 0.98)'
    : 'rgba(255, 255, 255, 0.96)';
  const panelBorder = colorScheme === 'dark'
    ? 'rgba(181, 175, 255, 0.2)'
    : 'rgba(102, 92, 165, 0.16)';
  const activeChip = colorScheme === 'dark'
    ? 'rgba(138, 131, 255, 0.18)'
    : 'rgba(93, 90, 246, 0.12)';
  const inactiveChip = colorScheme === 'dark'
    ? 'rgba(255, 255, 255, 0.02)'
    : 'rgba(93, 90, 246, 0.02)';
  const activeColor = theme.colors.primary;
  const inactiveColor = theme.colors.textMuted;
  const panelShadow = colorScheme === 'dark' ? '#000000' : '#5D5AF6';

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={[styles.outer, { paddingBottom: bottomInset }]}>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: panelBackground,
              borderColor: panelBorder,
              shadowColor: panelShadow,
            },
          ]}
        >
          <View style={styles.row}>
            {state.routes.map((route, index) => {
              const descriptor = descriptors[route.key];
              const { options } = descriptor;

              if (options.tabBarButton === null) {
                return null;
              }

              const isFocused = state.index === index;
              const label = getLabel(options, route.name);
              const showLabel = options.tabBarShowLabel !== false;
              const color = isFocused ? activeColor : inactiveColor;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              const icon = options.tabBarIcon?.({
                focused: isFocused,
                color,
                size: isDense ? 18 : 22,
              });

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarButtonTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={({ pressed }) => [
                    styles.item,
                    isDense && styles.itemDense,
                    {
                      backgroundColor: isFocused ? activeChip : inactiveChip,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View style={[styles.itemContent, isDense && styles.itemContentDense, !showLabel && styles.itemContentIconOnly]}>
                    <View style={[styles.iconWrap, !showLabel && styles.iconWrapIconOnly]}>{icon}</View>
                    {showLabel && (
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="clip"
                        style={[
                          styles.label,
                          isDense && styles.labelDense,
                          { color },
                        ]}
                      >
                        {label}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  outer: {
    paddingHorizontal: 12,
  },
  panel: {
    minHeight: TAB_BAR_CONTENT_HEIGHT,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 6,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  itemDense: {
    minHeight: 60,
    borderRadius: 18,
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  itemContent: {
    width: '100%',
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemContentDense: {
    gap: 2,
  },
  itemContentIconOnly: {
    gap: 0,
  },
  iconWrap: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapIconOnly: {
    height: 28,
  },
  label: {
    width: '100%',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.15,
    textAlign: 'center',
    includeFontPadding: false,
  },
  labelDense: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.1,
  },
});
