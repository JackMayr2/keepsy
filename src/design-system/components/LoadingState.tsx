import React from 'react';
import {
  Modal,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { KeepsyBookLoader } from './KeepsyBookLoader';

type LoadingStateProps = {
  /**
   * Screen reader only — no visible text.
   * If both are set, they are combined for `accessibilityLabel`.
   */
  title?: string;
  message?: string;
  /** Overrides composed title/message for screen readers. */
  accessibilityLabel?: string;
  /** Lottie size in px. Defaults: **104** when `fill`, **56** otherwise. */
  size?: number;
  minHeight?: number;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * When `fill` is true, adds a light scrim so the screen feels slightly muted.
   * The dim layer covers the **full window** (not just the padded content area).
   * @default true
   */
  dimBackground?: boolean;
  /** When `fill` is true, optional line of text shown under the loader (e.g. upload progress). */
  visibleSubtitle?: string;
};

const DEFAULT_SIZE_INLINE = 56;
const DEFAULT_SIZE_FILL = 104;

function composeA11yLabel(
  accessibilityLabel: string | undefined,
  title: string | undefined,
  message: string | undefined
): string {
  if (accessibilityLabel?.trim()) return accessibilityLabel.trim();
  const parts = [title, message].filter((p): p is string => Boolean(p?.trim()));
  return parts.length ? parts.join('. ') : 'Loading';
}

export function LoadingState({
  title,
  message,
  accessibilityLabel,
  size: sizeProp,
  minHeight = 200,
  fill = false,
  dimBackground = true,
  visibleSubtitle,
  style,
}: LoadingStateProps) {
  const { colorScheme } = useTheme();

  const size = sizeProp ?? (fill ? DEFAULT_SIZE_FILL : DEFAULT_SIZE_INLINE);

  const { width: winW, height: winH } = useWindowDimensions();

  const scrim =
    colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.48)' : 'rgba(0, 0, 0, 0.18)';

  const a11y = composeA11yLabel(accessibilityLabel, title, message);

  const inner = (
    <KeepsyBookLoader size={size} accessibilityLabel={a11y} />
  );

  if (fill) {
    return (
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent={Platform.OS === 'android'}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      >
        <View style={[styles.modalRoot, { width: winW, height: winH }, style]}>
          {dimBackground ? (
            <View
              style={[StyleSheet.absoluteFillObject, { backgroundColor: scrim }]}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
          <View style={styles.modalCenter} pointerEvents="box-none">
            {inner}
            {visibleSubtitle ? (
              <Text style={styles.visibleSubtitle} numberOfLines={2}>
                {visibleSubtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View
      style={[
        styles.root,
        { minHeight },
        style,
      ]}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  modalRoot: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  modalCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  visibleSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});
