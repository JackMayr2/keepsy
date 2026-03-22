import React, { useRef, useState, useCallback } from 'react';
import { Image, PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';
import { KEEPSY_LOGO_IMAGE } from '../keepsyLogoAsset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const ICON_SIZE = 56;
const TAP_THRESHOLD = 10;
const EDGE_PADDING = 16;

export function FloatingKeepsyIcon() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [position, setPosition] = useState(() => ({
    x: windowWidth - ICON_SIZE - EDGE_PADDING,
    y: windowHeight - ICON_SIZE - EDGE_PADDING - insets.bottom - 24,
  }));

  const touchStart = useRef({ pageX: 0, pageY: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const positionRef = useRef(position);
  positionRef.current = position;

  const clampX = useCallback(
    (x: number) => Math.max(0, Math.min(windowWidth - ICON_SIZE, x)),
    [windowWidth]
  );
  const clampY = useCallback(
    (y: number) => Math.max(0, Math.min(windowHeight - ICON_SIZE, y)),
    [windowHeight]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > 5 || Math.abs(dy) > 5,
      onPanResponderGrant: (evt) => {
        const native = evt?.nativeEvent;
        if (!native) return;
        touchStart.current = { pageX: native.pageX, pageY: native.pageY };
        const p = positionRef.current;
        dragOffset.current = { x: native.pageX - p.x, y: native.pageY - p.y };
      },
      onPanResponderMove: (evt) => {
        const native = evt?.nativeEvent;
        if (!native) return;
        const x = clampX(native.pageX - dragOffset.current.x);
        const y = clampY(native.pageY - dragOffset.current.y);
        setPosition({ x, y });
      },
      onPanResponderRelease: (evt) => {
        const native = evt?.nativeEvent;
        if (!native) return;
        const dx = native.pageX - touchStart.current.pageX;
        const dy = native.pageY - touchStart.current.pageY;
        if (Math.sqrt(dx * dx + dy * dy) < TAP_THRESHOLD) {
          router.push('/(app)/(tabs)/settings');
        }
      },
    })
  ).current;

  return (
    <View
      style={[styles.wrap, { left: position.x, top: position.y }]}
      {...panResponder.panHandlers}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
    >
      <Image source={KEEPSY_LOGO_IMAGE} style={styles.icon} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
  },
});
