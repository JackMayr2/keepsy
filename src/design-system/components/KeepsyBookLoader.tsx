import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

type KeepsyBookLoaderProps = {
  size?: number;
  style?: ViewStyle;
};

const EASE = Easing.bezier(0.42, 0, 0.2, 1);
const D_FLIP = 540;
const D_PAUSE = 160;
const D_GAP = 200;

/**
 * Stylized open book: pages alternate from right stack → left, then left → right,
 * with stack edges that swell/fade to sell pages being added and removed.
 */
export function KeepsyBookLoader({ size = 56, style }: KeepsyBookLoaderProps) {
  const flipR = useSharedValue(0);
  const flipL = useSharedValue(0);

  useEffect(() => {
    // One full cycle: R flips → gap → L flips → gap (same length so loops stay aligned)
    const afterR = D_FLIP + D_PAUSE;
    const leadL = afterR + D_GAP;
    const afterL = leadL + D_FLIP + D_PAUSE;
    const period = afterL + D_GAP;
    const idleAfterR = period - afterR;

    flipR.value = withRepeat(
      withSequence(
        withTiming(1, { duration: D_FLIP, easing: EASE }),
        withTiming(1, { duration: D_PAUSE }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: idleAfterR })
      ),
      -1,
      false
    );

    flipL.value = withRepeat(
      withSequence(
        withTiming(0, { duration: leadL }),
        withTiming(1, { duration: D_FLIP, easing: EASE }),
        withTiming(1, { duration: D_PAUSE }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: period - (leadL + D_FLIP + D_PAUSE) })
      ),
      -1,
      false
    );
  }, [flipL, flipR]);

  const pad = Math.max(4, size * 0.08);
  const bookW = size - pad * 2;
  const bookH = size - pad * 2;
  const mid = bookW / 2;
  const spineW = Math.max(3, bookW * 0.07);
  const leftW = mid;
  const rightW = bookW - mid;
  const corner = Math.max(6, Math.round(size * 0.16));

  const stackRStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipR.value, [0, 1], [1, 0.38]) * interpolate(flipL.value, [0, 1], [0.42, 1]),
    transform: [
      { translateX: interpolate(flipR.value, [0, 1], [0, -2]) },
      { scaleX: interpolate(flipR.value, [0, 1], [1, 0.88]) },
    ],
  }));

  const stackLStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipR.value, [0, 1], [0.4, 1]) * interpolate(flipL.value, [0, 1], [1, 0.38]),
    transform: [
      { translateX: interpolate(flipL.value, [0, 1], [0, 2]) },
      { scaleX: interpolate(flipL.value, [0, 1], [1, 0.88]) },
    ],
  }));

  const flipRightStyle = useAnimatedStyle(() => {
    const deg = interpolate(flipR.value, [0, 1], [0, -176]);
    return {
      transform: [
        { perspective: 900 },
        { translateX: rightW / 2 },
        { rotateY: `${deg}deg` },
        { translateX: -rightW / 2 },
      ],
    };
  });

  const flipLeftStyle = useAnimatedStyle(() => {
    const deg = interpolate(flipL.value, [0, 1], [0, 176]);
    return {
      transform: [
        { perspective: 900 },
        { translateX: -leftW / 2 },
        { rotateY: `${deg}deg` },
        { translateX: leftW / 2 },
      ],
    };
  });

  const sliverW = Math.max(1.5, bookW * 0.028);
  const sliverCount = 6;

  return (
    <View
      style={[styles.wrap, { width: size, height: size }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
    >
      <View style={[styles.outer, { width: size, height: size, borderRadius: corner }]}>
        {/* Book interior */}
        <View style={[styles.book, { left: pad, top: pad, width: bookW, height: bookH }]}>
          {/* Left stack (page edges) */}
          <Animated.View style={[styles.stackSide, stackLStyle]} pointerEvents="none">
            {Array.from({ length: sliverCount }).map((_, i) => (
              <View
                key={`l-${i}`}
                style={[
                  styles.sliver,
                  {
                    width: sliverW,
                    height: bookH * 0.82,
                    marginRight: i === sliverCount - 1 ? 0 : 1.5,
                    opacity: 0.2 + (i / sliverCount) * 0.55,
                    backgroundColor: `rgba(${220 - i * 12}, ${210 - i * 8}, ${245 - i * 6}, 0.9)`,
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* Right stack */}
          <Animated.View style={[styles.stackSide, styles.stackRight, stackRStyle]} pointerEvents="none">
            {Array.from({ length: sliverCount }).map((_, i) => (
              <View
                key={`r-${i}`}
                style={[
                  styles.sliver,
                  {
                    width: sliverW,
                    height: bookH * 0.82,
                    marginLeft: i === sliverCount - 1 ? 0 : 1.5,
                    opacity: 0.2 + (i / sliverCount) * 0.55,
                    backgroundColor: `rgba(${220 - i * 12}, ${210 - i * 8}, ${245 - i * 6}, 0.9)`,
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* Spine */}
          <View
            style={[
              styles.spineWrap,
              { left: mid - spineW / 2, width: spineW, height: bookH * 0.94, top: bookH * 0.03 },
            ]}
          >
            <LinearGradient
              colors={['#5B54E8', '#9B6DFF', '#E89BC4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.spineSheen} />
          </View>

          {/* Open spread (dark “gutter”) — no lettering */}
          <View
            style={[
              styles.gutter,
              {
                left: mid - spineW * 1.2,
                width: spineW * 2.4,
                height: bookH * 0.72,
                top: bookH * 0.14,
              },
            ]}
          />

          {/* Subtle sparkles (no text) */}
          <View style={[styles.sparkle, { left: mid - bookW * 0.22, top: bookH * 0.28 }]} />
          <View style={[styles.sparkle, styles.sparkleSm, { left: mid + bookW * 0.12, top: bookH * 0.52 }]} />
          <View style={[styles.sparkle, styles.sparkleSm, { left: mid - bookW * 0.08, top: bookH * 0.62 }]} />

          {/* Page turning: right → left */}
          <View style={[styles.flipMountRight, { left: mid, width: rightW, top: 0, height: bookH }]} pointerEvents="none">
            <Animated.View
              style={[
                {
                  width: rightW,
                  height: bookH,
                  overflow: 'hidden',
                  backfaceVisibility: 'hidden',
                },
                flipRightStyle,
              ]}
            >
              <PageFace width={rightW} height={bookH} side="right" />
            </Animated.View>
          </View>

          {/* Page turning: left → right */}
          <View style={[styles.flipMountLeft, { left: 0, width: leftW, top: 0, height: bookH }]} pointerEvents="none">
            <Animated.View
              style={[
                {
                  width: leftW,
                  height: bookH,
                  overflow: 'hidden',
                  backfaceVisibility: 'hidden',
                },
                flipLeftStyle,
              ]}
            >
              <PageFace width={leftW} height={bookH} side="left" />
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
}

function PageFace({
  width,
  height,
  side,
}: {
  width: number;
  height: number;
  side: 'left' | 'right';
}) {
  const lines = 4;
  const padX = width * 0.12;
  return (
    <View
      style={[
        styles.page,
        {
          width,
          height,
          borderTopLeftRadius: side === 'left' ? 5 : 2,
          borderBottomLeftRadius: side === 'left' ? 5 : 2,
          borderTopRightRadius: side === 'right' ? 5 : 2,
          borderBottomRightRadius: side === 'right' ? 5 : 2,
        },
      ]}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.pageLine,
            {
              top: height * (0.22 + i * 0.14),
              width: width - padX * 2 - i * 4,
              left: side === 'left' ? padX : padX,
              opacity: 0.35 - i * 0.05,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outer: {
    overflow: 'hidden',
    backgroundColor: '#07060f',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(155, 109, 255, 0.35)',
  },
  book: {
    position: 'absolute',
    overflow: 'visible',
  },
  stackSide: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    zIndex: 1,
    left: 0,
    paddingLeft: 2,
  },
  stackRight: {
    right: 0,
    paddingLeft: 0,
    paddingRight: 2,
    flexDirection: 'row-reverse',
  },
  sliver: {
    borderRadius: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  spineWrap: {
    position: 'absolute',
    borderRadius: 3,
    overflow: 'hidden',
    zIndex: 3,
    shadowColor: '#9B6DFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  spineSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: '8%',
    marginHorizontal: '18%',
    borderRadius: 2,
  },
  gutter: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    zIndex: 2,
  },
  sparkle: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
    zIndex: 2,
  },
  sparkleSm: {
    width: 2,
    height: 2,
    opacity: 0.75,
  },
  flipMountRight: {
    position: 'absolute',
    zIndex: 8,
    overflow: 'visible',
  },
  flipMountLeft: {
    position: 'absolute',
    zIndex: 9,
    overflow: 'visible',
  },
  page: {
    backgroundColor: '#f3effb',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(155, 109, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  pageLine: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(105, 98, 255, 0.15)',
    borderRadius: 1,
  },
});
