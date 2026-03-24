import React, { useCallback, useEffect, useMemo } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
/** Feels close to system photo viewer / map zoom */
const SPRING = { damping: 22, stiffness: 280, mass: 0.65 };
const DOUBLE_TAP_SCALE = 2.75;

type Props = {
  uri: string;
  width: number;
  height: number;
  isActive: boolean;
  allowPan: boolean;
  onZoomChange?: (zoomed: boolean) => void;
};

const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * Full-screen photo zoom: focal-point pinch (Photos / Maps style), one-finger pan when zoomed,
 * double-tap to zoom in/out toward the tap. Web: plain image.
 */
export function FullscreenZoomablePhoto({
  uri,
  width,
  height,
  isActive,
  allowPan,
  onZoomChange,
}: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchBaseScale = useSharedValue(1);
  const pinchBaseTx = useSharedValue(0);
  const pinchBaseTy = useSharedValue(0);
  const panStartTx = useSharedValue(0);
  const panStartTy = useSharedValue(0);
  /** 1 once we've told JS we're zoomed (avoids pager steal at 1× + runOnJS spam). */
  const zoomNotified = useSharedValue(0);

  const notifyZoom = useCallback(
    (z: boolean) => {
      onZoomChange?.(z);
    },
    [onZoomChange]
  );

  const resetTransform = useCallback(() => {
    zoomNotified.value = 0;
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    notifyZoom(false);
  }, [zoomNotified, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY, notifyZoom]);

  useEffect(() => {
    resetTransform();
  }, [uri, resetTransform]);

  useEffect(() => {
    if (!isActive) {
      resetTransform();
    }
  }, [isActive, resetTransform]);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          pinchBaseScale.value = savedScale.value;
          pinchBaseTx.value = savedTranslateX.value;
          pinchBaseTy.value = savedTranslateY.value;
        })
        .onUpdate((e) => {
          const b = pinchBaseScale.value;
          const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, b * e.scale));
          const fx = e.focalX;
          const fy = e.focalY;
          // Keep the world point under the pinch focal fixed while scaling (Photos-style).
          translateX.value = fx - (fx - pinchBaseTx.value) * (s / b);
          translateY.value = fy - (fy - pinchBaseTy.value) * (s / b);
          scale.value = s;
          if (s > 1.02 && zoomNotified.value === 0) {
            zoomNotified.value = 1;
            runOnJS(notifyZoom)(true);
          }
        })
        .onEnd(() => {
          savedScale.value = scale.value;
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;

          if (scale.value < 1.02) {
            zoomNotified.value = 0;
            scale.value = withSpring(1, SPRING, (finished) => {
              if (finished) {
                savedScale.value = 1;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                runOnJS(notifyZoom)(false);
              }
            });
            translateX.value = withSpring(0, SPRING);
            translateY.value = withSpring(0, SPRING);
          } else {
            zoomNotified.value = 1;
            runOnJS(notifyZoom)(true);
          }
        }),
    [
      notifyZoom,
      pinchBaseScale,
      pinchBaseTx,
      pinchBaseTy,
      scale,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      translateX,
      translateY,
      zoomNotified,
    ]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .enabled(allowPan)
        .onBegin(() => {
          panStartTx.value = savedTranslateX.value;
          panStartTy.value = savedTranslateY.value;
        })
        .onUpdate((e) => {
          if (savedScale.value > 1.01) {
            translateX.value = panStartTx.value + e.translationX;
            translateY.value = panStartTy.value + e.translationY;
          }
        })
        .onEnd(() => {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        }),
    [allowPan, panStartTx, panStartTy, savedScale, savedTranslateX, savedTranslateY, translateX, translateY]
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(280)
        .onEnd((e) => {
          const fx = e.x;
          const fy = e.y;
          const s0 = savedScale.value;
          const tx0 = savedTranslateX.value;
          const ty0 = savedTranslateY.value;

          if (s0 > 1.08) {
            zoomNotified.value = 0;
            // Zoom out — spring back to identity
            scale.value = withSpring(1, SPRING, (finished) => {
              if (finished) {
                savedScale.value = 1;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                runOnJS(notifyZoom)(false);
              }
            });
            translateX.value = withSpring(0, SPRING);
            translateY.value = withSpring(0, SPRING);
            return;
          }

          // Zoom in toward tap
          const target = Math.min(MAX_SCALE, DOUBLE_TAP_SCALE);
          const newTx = fx - (fx - tx0) * (target / s0);
          const newTy = fy - (fy - ty0) * (target / s0);

          zoomNotified.value = 1;
          scale.value = withSpring(target, SPRING);
          translateX.value = withSpring(newTx, SPRING);
          translateY.value = withSpring(newTy, SPRING);

          savedScale.value = target;
          savedTranslateX.value = newTx;
          savedTranslateY.value = newTy;
          runOnJS(notifyZoom)(true);
        }),
    [notifyZoom, scale, savedScale, savedTranslateX, savedTranslateY, translateX, translateY, zoomNotified]
  );

  const zoomGestures = useMemo(
    () => Gesture.Simultaneous(pinchGesture, panGesture),
    [pinchGesture, panGesture]
  );

  const composed = useMemo(
    () => Gesture.Exclusive(doubleTap, zoomGestures),
    [doubleTap, zoomGestures]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.box, { width, height }]}>
        <Image source={{ uri }} style={[styles.image, { width, height }]} resizeMode="contain" />
      </View>
    );
  }

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.box, { width, height }]}>
        <AnimatedImage
          source={{ uri }}
          style={[styles.image, { width, height }, animatedStyle]}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  box: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: '#000000',
  },
});
