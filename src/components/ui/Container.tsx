import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTheme } from '@/src/contexts/ThemeContext';
import type { BrandBackgroundPreset } from '@/src/design-system';
import { ScreenBackground } from '@/src/components/ui/ScreenBackground';
import { AppKeyboardAwareScrollView } from '@/src/components/ui/AppKeyboardAwareScrollView';

const DEFAULT_BOTTOM = 32;

export interface ContainerProps {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Extra bottom padding (e.g. for floating tab bar: TAB_BAR_CONTENT_HEIGHT) */
  extraBottomPadding?: number;
  /** Positive pushes content down; negative pulls content up. */
  contentTopOffset?: number;
  /** Use safe-area top inset instead of nav header height. */
  ignoreHeaderHeight?: boolean;
  backgroundPreset?: BrandBackgroundPreset;
}

export function Container({
  children,
  scroll = false,
  style,
  extraBottomPadding = 0,
  contentTopOffset = 0,
  ignoreHeaderHeight = false,
  backgroundPreset = 'daydream',
}: ContainerProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topInset = ignoreHeaderHeight ? insets.top : headerHeight > 0 ? headerHeight : insets.top;
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
    paddingTop: spacing.xl + topInset + contentTopOffset,
  };

  if (scroll) {
    const scrollPaddingBottom = DEFAULT_BOTTOM + extraBottomPadding + insets.bottom;
    return (
      <View style={[containerStyle, style]}>
        <ScreenBackground preset={backgroundPreset} />
        <AppKeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        >
          <View style={[contentStyle, styles.scrollFill]}>{children}</View>
        </AppKeyboardAwareScrollView>
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <ScreenBackground preset={backgroundPreset} />
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
