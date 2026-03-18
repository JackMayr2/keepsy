import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { keepsyGradients } from '../theme/keepsy-tokens';

export type BrandBackgroundPreset = 'daydream' | 'afterparty';

type BrandBackgroundProps = {
  preset?: BrandBackgroundPreset;
};

const presetConfig = {
  daydream: {
    base: keepsyGradients.daydream,
    blobs: [
      ['rgba(132, 236, 255, 0.94)', 'rgba(214, 220, 255, 0.88)', 'rgba(255, 41, 214, 0.92)'],
      ['rgba(148, 235, 255, 0.84)', 'rgba(203, 214, 255, 0.78)', 'rgba(255, 102, 195, 0.84)'],
      ['rgba(118, 228, 255, 0.82)', 'rgba(198, 189, 255, 0.76)', 'rgba(255, 87, 199, 0.8)'],
    ],
    sheen: ['rgba(255,255,255,0.32)', 'rgba(255,255,255,0)'],
  },
  afterparty: {
    base: keepsyGradients.afterparty,
    blobs: [
      ['rgba(118, 228, 255, 0.9)', 'rgba(189, 184, 255, 0.84)', 'rgba(255, 18, 206, 0.9)'],
      ['rgba(106, 224, 255, 0.76)', 'rgba(174, 178, 255, 0.72)', 'rgba(255, 95, 189, 0.76)'],
      ['rgba(124, 233, 255, 0.72)', 'rgba(178, 161, 255, 0.7)', 'rgba(255, 116, 205, 0.72)'],
    ],
    sheen: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'],
  },
} as const;

function buildLoop(value: Animated.Value, duration: number) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 0,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ])
  );
}

type OrganicBlobDefinition = {
  main: {
    left: number;
    top: number;
    width: number;
    height: number;
    rotate: string;
    skewX: string;
    skewY: string;
    radii: {
      borderTopLeftRadius: number;
      borderTopRightRadius: number;
      borderBottomRightRadius: number;
      borderBottomLeftRadius: number;
    };
  };
  satellites?: Array<{
    left: number;
    top: number;
    size: number;
    opacity?: number;
  }>;
  highlight: {
    left: number;
    top: number;
    width: number;
    height: number;
    rotate: string;
  };
};

function OrganicBlob({
  width,
  height,
  colors,
  definition,
}: {
  width: number;
  height: number;
  colors: readonly [string, string, string];
  definition: OrganicBlobDefinition;
}) {
  return (
    <View style={{ width, height }}>
      <LinearGradient
        colors={[colors[0], colors[1], 'rgba(255,255,255,0)']}
        start={{ x: 0.12, y: 0.08 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          styles.glow,
          {
            left: definition.main.left - width * 0.02,
            top: definition.main.top + height * 0.04,
            width: definition.main.width * 1.06,
            height: definition.main.height * 1.08,
            transform: [
              { rotate: definition.main.rotate },
              { skewX: definition.main.skewX },
              { skewY: definition.main.skewY },
            ],
          },
          definition.main.radii,
        ]}
      />

      <LinearGradient
        colors={[...colors]}
        start={{ x: 0.14, y: 0.06 }}
        end={{ x: 0.9, y: 0.92 }}
        style={[
          styles.mainShape,
          {
            left: definition.main.left,
            top: definition.main.top,
            width: definition.main.width,
            height: definition.main.height,
            transform: [
              { rotate: definition.main.rotate },
              { skewX: definition.main.skewX },
              { skewY: definition.main.skewY },
            ],
          },
          definition.main.radii,
        ]}
      />

      {definition.satellites?.map((satellite, index) => (
        <LinearGradient
          key={`satellite-${index}`}
          colors={[...colors]}
          start={{ x: 0.12, y: 0.08 }}
          end={{ x: 0.9, y: 0.92 }}
          style={[
            styles.satellite,
            {
              left: satellite.left,
              top: satellite.top,
              width: satellite.size,
              height: satellite.size,
              opacity: satellite.opacity ?? 0.92,
            },
          ]}
        />
      ))}
      <LinearGradient
        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={[
          styles.highlight,
          {
            left: definition.highlight.left,
            top: definition.highlight.top,
            width: definition.highlight.width,
            height: definition.highlight.height,
            transform: [{ rotate: definition.highlight.rotate }],
          },
        ]}
      />
    </View>
  );
}

export function BrandBackground({ preset = 'daydream' }: BrandBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const driftC = useRef(new Animated.Value(0)).current;
  const config = presetConfig[preset];

  useEffect(() => {
    const loops = [
      buildLoop(driftA, 12000),
      buildLoop(driftB, 15000),
      buildLoop(driftC, 18000),
    ];

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [driftA, driftB, driftC]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[...config.base]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.blob,
          {
            width: width * 0.88,
            height: width * 0.88,
            top: -width * 0.28,
            right: -width * 0.18,
            transform: [
              { translateX: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) },
              { translateY: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) },
              { scale: driftA.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
            ],
          },
        ]}
      >
        <OrganicBlob
          width={width * 0.88}
          height={width * 0.88}
          colors={config.blobs[0]}
          definition={{
            main: {
              left: width * 0.06,
              top: width * 0.08,
              width: width * 0.62,
              height: width * 0.54,
              rotate: '18deg',
              skewX: '-11deg',
              skewY: '-2deg',
              radii: {
                borderTopLeftRadius: width * 0.34,
                borderTopRightRadius: width * 0.26,
                borderBottomRightRadius: width * 0.38,
                borderBottomLeftRadius: width * 0.18,
              },
            },
            satellites: [
              {
                left: width * 0.72,
                top: width * 0.18,
                size: width * 0.14,
              },
            ],
            highlight: {
              left: width * 0.18,
              top: width * 0.2,
              width: width * 0.18,
              height: width * 0.08,
              rotate: '-18deg',
            },
          }}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.blob,
          {
            width: width * 0.7,
            height: width * 0.7,
            bottom: height * 0.08,
            left: -width * 0.18,
            transform: [
              { translateX: driftB.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }) },
              { translateY: driftB.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
              { scale: driftB.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
            ],
          },
        ]}
      >
        <OrganicBlob
          width={width * 0.7}
          height={width * 0.7}
          colors={config.blobs[1]}
          definition={{
            main: {
              left: width * 0.02,
              top: width * 0.16,
              width: width * 0.5,
              height: width * 0.42,
              rotate: '-12deg',
              skewX: '8deg',
              skewY: '0deg',
              radii: {
                borderTopLeftRadius: width * 0.28,
                borderTopRightRadius: width * 0.18,
                borderBottomRightRadius: width * 0.22,
                borderBottomLeftRadius: width * 0.34,
              },
            },
            satellites: [
              {
                left: width * 0.44,
                top: width * 0.04,
                size: width * 0.11,
                opacity: 0.82,
              },
            ],
            highlight: {
              left: width * 0.1,
              top: width * 0.23,
              width: width * 0.14,
              height: width * 0.06,
              rotate: '-28deg',
            },
          }}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.blob,
          {
            width: width * 0.54,
            height: width * 0.54,
            top: height * 0.34,
            right: width * 0.02,
            transform: [
              { translateX: driftC.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
              { translateY: driftC.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) },
              { scale: driftC.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
            ],
          },
        ]}
      >
        <OrganicBlob
          width={width * 0.54}
          height={width * 0.54}
          colors={config.blobs[2]}
          definition={{
            main: {
              left: width * 0.02,
              top: width * 0.04,
              width: width * 0.34,
              height: width * 0.28,
              rotate: '22deg',
              skewX: '-10deg',
              skewY: '1deg',
              radii: {
                borderTopLeftRadius: width * 0.18,
                borderTopRightRadius: width * 0.12,
                borderBottomRightRadius: width * 0.2,
                borderBottomLeftRadius: width * 0.1,
              },
            },
            satellites: [
              {
                left: width * 0.28,
                top: width * 0.22,
                size: width * 0.08,
                opacity: 0.74,
              },
            ],
            highlight: {
              left: width * 0.08,
              top: width * 0.1,
              width: width * 0.1,
              height: width * 0.04,
              rotate: '-16deg',
            },
          }}
        />
      </Animated.View>

      <LinearGradient
        colors={[...config.sheen]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.8, y: 0.9 }}
        style={styles.sheen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    opacity: 1,
  },
  mainShape: {
    position: 'absolute',
  },
  glow: {
    position: 'absolute',
    opacity: 0.34,
  },
  satellite: {
    position: 'absolute',
    borderRadius: 999,
  },
  highlight: {
    position: 'absolute',
    borderRadius: 999,
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
});
