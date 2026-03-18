import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, ScrollView, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTheme } from '@/src/contexts/ThemeContext';
import { standardScrollViewProps } from '@/src/design-system/constants/scroll';
import { BrandBackground, type BrandBackgroundPreset } from '@/src/design-system';

const DEFAULT_BOTTOM = 32;

export interface ContainerProps {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Extra bottom padding (e.g. for floating tab bar: TAB_BAR_CONTENT_HEIGHT) */
  extraBottomPadding?: number;
  backgroundPreset?: BrandBackgroundPreset;
}

export function Container({
  children,
  scroll = false,
  style,
  extraBottomPadding = 0,
  backgroundPreset = 'daydream',
}: ContainerProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topInset = headerHeight > 0 ? headerHeight : insets.top;
  const { spacing } = theme;

  const containerStyle = {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  const contentStyle = {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + topInset,
  };

  if (scroll) {
    const scrollPaddingBottom = DEFAULT_BOTTOM + extraBottomPadding + insets.bottom;
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        {...standardScrollViewProps}
      >
        <View style={[containerStyle, styles.scrollFill, style]}>
          <BrandBackground preset={backgroundPreset} />
          <View style={[contentStyle, { paddingBottom: scrollPaddingBottom }]}>{children}</View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <BrandBackground preset={backgroundPreset} />
      <View style={[contentStyle, { paddingBottom: DEFAULT_BOTTOM + extraBottomPadding + insets.bottom }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollFill: {
    minHeight: '100%',
  },
});
