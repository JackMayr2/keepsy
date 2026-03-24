import React, { type ComponentProps } from 'react';
import { Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { standardScrollViewProps } from '@/src/design-system/constants/scroll';

export type AppKeyboardAwareScrollViewProps = ComponentProps<typeof KeyboardAwareScrollView> & {
  /**
   * Use inside bottom-sheet modals: avoids stacking with KeyboardAvoidingView and
   * `automaticallyAdjustKeyboardInsets` (which causes overscroll then snap-back).
   */
  presentation?: 'screen' | 'modal';
};

/**
 * ScrollView that scrolls focused TextInputs above the keyboard (iOS + Android).
 */
export function AppKeyboardAwareScrollView({
  enableOnAndroid = true,
  enableAutomaticScroll = true,
  extraScrollHeight = 48,
  extraHeight = 20,
  keyboardOpeningTime = 250,
  presentation = 'screen',
  ...rest
}: AppKeyboardAwareScrollViewProps) {
  const isModal = presentation === 'modal';
  return (
    <KeyboardAwareScrollView
      enableOnAndroid={enableOnAndroid}
      enableAutomaticScroll={enableAutomaticScroll}
      extraScrollHeight={extraScrollHeight}
      extraHeight={extraHeight}
      keyboardOpeningTime={keyboardOpeningTime}
      {...standardScrollViewProps}
      {...(Platform.OS === 'ios'
        ? isModal
          ? {
              contentInsetAdjustmentBehavior: 'never' as const,
            }
          : {
              contentInsetAdjustmentBehavior: 'automatic' as const,
              automaticallyAdjustKeyboardInsets: true,
            }
        : {})}
      {...rest}
    />
  );
}
