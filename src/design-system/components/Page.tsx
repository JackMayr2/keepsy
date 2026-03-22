import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { YStack, YStackProps } from 'tamagui';
import type { BrandBackgroundPreset } from './BrandBackground';
import { ScreenBackground } from '@/src/components/ui/ScreenBackground';
import { AppKeyboardAwareScrollView } from '@/src/components/ui/AppKeyboardAwareScrollView';

type PageProps = YStackProps & {
  scroll?: boolean;
  /** When inside a floating tab bar (e.g. main app tabs), pass tab bar height so content doesn't sit under it. */
  floatingTabBarHeight?: number;
  backgroundPreset?: BrandBackgroundPreset;
};

const PAGE_PADDING_H = 24;
const PAGE_PADDING_TOP = 20;
const PAGE_PADDING_BOTTOM = 40;

export function Page({
  scroll,
  children,
  floatingTabBarHeight = 0,
  backgroundPreset = 'daydream',
  ...rest
}: PageProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topInset = headerHeight > 0 ? headerHeight : insets.top;
  const paddingTop = PAGE_PADDING_TOP + topInset;
  const bottomPadding = PAGE_PADDING_BOTTOM + insets.bottom + floatingTabBarHeight;

  const content = (
    <YStack flex={1} position="relative" overflow="hidden" backgroundColor="transparent">
      <ScreenBackground preset={backgroundPreset} />
      <YStack
        flex={1}
        zIndex={1}
        paddingHorizontal={PAGE_PADDING_H}
        paddingTop={paddingTop}
        paddingBottom={bottomPadding}
        {...rest}
      >
        {children}
      </YStack>
    </YStack>
  );

  if (scroll) {
    return (
      <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <ScreenBackground preset={backgroundPreset} />
        <AppKeyboardAwareScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomPadding }}
        >
          <YStack
            flex={1}
            minHeight="100%"
            zIndex={1}
            paddingHorizontal={PAGE_PADDING_H}
            paddingTop={paddingTop}
            {...rest}
          >
            {children}
          </YStack>
        </AppKeyboardAwareScrollView>
      </View>
    );
  }

  return content;
}
