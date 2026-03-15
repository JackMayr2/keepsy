import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

export function AnimatedBlobBackground() {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = () => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse1, {
              toValue: 1.08,
              duration: 4000,
              useNativeDriver: true,
            }),
            Animated.timing(pulse1, {
              toValue: 1,
              duration: 4000,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse2, {
              toValue: 1.05,
              duration: 5000,
              useNativeDriver: true,
            }),
            Animated.timing(pulse2, {
              toValue: 1,
              duration: 5000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    };
    anim();
  }, [pulse1, pulse2]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#FDF2F8', '#F5F3FF', '#EFF6FF']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blob1,
          { transform: [{ scale: pulse1 }] },
        ]}
      >
        <LinearGradient
          colors={['#C4B5FD', '#A78BFA']}
          style={styles.blobInner}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.blob,
          styles.blob2,
          { transform: [{ scale: pulse2 }] },
        ]}
      >
        <LinearGradient
          colors={['#FBCFE8', '#F9A8D4']}
          style={styles.blobInner}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  blobInner: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  blob1: {
    width: W * 0.8,
    height: W * 0.8,
    top: -W * 0.3,
    right: -W * 0.2,
  },
  blob2: {
    width: W * 0.6,
    height: W * 0.6,
    bottom: -W * 0.2,
    left: -W * 0.2,
  },
});
