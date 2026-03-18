import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/contexts/ThemeContext';

type BrandLogoProps = {
  variant?: 'lockup' | 'mark';
  size?: 'sm' | 'md' | 'lg';
  tagline?: string;
  inverse?: boolean;
  align?: 'left' | 'center';
};

const sizeMap = {
  sm: {
    mark: 40,
    gap: 10,
    title: 24,
    subtitle: 11,
    orbit: 8,
  },
  md: {
    mark: 52,
    gap: 12,
    title: 30,
    subtitle: 12,
    orbit: 10,
  },
  lg: {
    mark: 68,
    gap: 14,
    title: 38,
    subtitle: 13,
    orbit: 12,
  },
} as const;

export function BrandLogo({
  variant = 'lockup',
  size = 'md',
  tagline = 'social yearbooks',
  inverse = false,
  align = 'left',
}: BrandLogoProps) {
  const { theme } = useTheme();
  const dims = sizeMap[size];
  const textColor = inverse ? '#FFFFFF' : theme.colors.text;
  const subtitleColor = inverse ? 'rgba(255,255,255,0.78)' : theme.colors.textMuted;

  return (
    <View
      style={[
        styles.root,
        {
          gap: dims.gap,
          justifyContent: align === 'center' ? 'center' : 'flex-start',
        },
      ]}
    >
      <LinearGradient
        colors={['#6962FF', '#B66BFF', '#FF7AB4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.mark,
          {
            width: dims.mark,
            height: dims.mark,
            borderRadius: dims.mark * 0.34,
            shadowColor: '#6E5CFF',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: inverse ? 0.24 : 0.18,
            shadowRadius: 18,
            elevation: 8,
          },
        ]}
      >
        <View
          style={[
            styles.highlight,
            {
              borderRadius: dims.mark * 0.3,
              top: dims.mark * 0.1,
              right: dims.mark * 0.1,
              bottom: dims.mark * 0.1,
              left: dims.mark * 0.1,
            },
          ]}
        />
        <View
          style={[
            styles.stem,
            {
              left: dims.mark * 0.28,
              top: dims.mark * 0.18,
              width: dims.mark * 0.14,
              height: dims.mark * 0.62,
              borderRadius: dims.mark * 0.14,
            },
          ]}
        />
        <View
          style={[
            styles.arm,
            {
              top: dims.mark * 0.2,
              left: dims.mark * 0.42,
              width: dims.mark * 0.26,
              height: dims.mark * 0.12,
              borderRadius: dims.mark * 0.12,
              transform: [{ rotate: '-38deg' }],
            },
          ]}
        />
        <View
          style={[
            styles.arm,
            {
              top: dims.mark * 0.49,
              left: dims.mark * 0.4,
              width: dims.mark * 0.28,
              height: dims.mark * 0.12,
              borderRadius: dims.mark * 0.12,
              transform: [{ rotate: '39deg' }],
            },
          ]}
        />
        <View
          style={[
            styles.orbit,
            {
              width: dims.orbit,
              height: dims.orbit,
              borderRadius: dims.orbit / 2,
              right: dims.mark * 0.14,
              top: dims.mark * 0.16,
            },
          ]}
        />
      </LinearGradient>

      {variant === 'lockup' ? (
        <View style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }}>
          <Text
            style={[
              styles.title,
              {
                fontSize: dims.title,
                color: textColor,
                letterSpacing: -1.4,
              },
            ]}
          >
            Keepsy
          </Text>
          <Text style={[styles.subtitle, { fontSize: dims.subtitle, color: subtitleColor }]}>
            {tagline}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mark: {
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  stem: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  arm: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  orbit: {
    position: 'absolute',
    backgroundColor: '#FFD96E',
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
