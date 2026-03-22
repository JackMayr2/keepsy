import React, { type ComponentProps } from 'react';
import { Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { standardScrollViewProps } from '@/src/design-system/constants/scroll';

export type AppKeyboardAwareScrollViewProps = ComponentProps<typeof KeyboardAwareScrollView>;

/**
 * ScrollView that scrolls focused TextInputs above the keyboard (iOS + Android).
 */
export function AppKeyboardAwareScrollView({
  enableOnAndroid = true,
  enableAutomaticScroll = true,
  extraScrollHeight = 28,
  extraHeight = 12,
  keyboardOpeningTime = 250,
  ...rest
}: AppKeyboardAwareScrollViewProps) {
  return (
    <KeyboardAwareScrollView
      enableOnAndroid={enableOnAndroid}
      enableAutomaticScroll={enableAutomaticScroll}
      extraScrollHeight={extraScrollHeight}
      extraHeight={extraHeight}
      keyboardOpeningTime={keyboardOpeningTime}
      {...standardScrollViewProps}
      {...(Platform.OS === 'ios'
        ? {
            /** Let the scroll view cooperate with keyboard + safe area */
            contentInsetAdjustmentBehavior: 'automatic' as const,
            automaticallyAdjustKeyboardInsets: true,
          }
        : {})}
      {...rest}
    />
  );
}
