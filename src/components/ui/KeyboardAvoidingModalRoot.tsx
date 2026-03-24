import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { KeyboardAvoidingView as ControllerKeyboardAvoidingView } from 'react-native-keyboard-controller';

export type KeyboardAvoidingModalRootProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Wrap transparent `Modal` content (flex: 1) so bottom sheets stay above the keyboard.
 * On iOS/Android uses react-native-keyboard-controller (needs {@link KeyboardProvider} in root).
 */
export function KeyboardAvoidingModalRoot({ children, style }: KeyboardAvoidingModalRootProps) {
  if (Platform.OS === 'web') {
    return (
      <RNKeyboardAvoidingView behavior="padding" enabled style={[styles.root, style]}>
        {children}
      </RNKeyboardAvoidingView>
    );
  }

  return (
    <ControllerKeyboardAvoidingView behavior="padding" enabled style={[styles.root, style]}>
      {children}
    </ControllerKeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
