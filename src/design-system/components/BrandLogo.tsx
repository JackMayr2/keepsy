import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { KEEPSY_LOGO_IMAGE } from '../keepsyLogoAsset';

type BrandLogoProps = {
  variant?: 'lockup' | 'mark';
  size?: 'sm' | 'md' | 'lg';
  tagline?: string;
  inverse?: boolean;
  align?: 'left' | 'center';
};

const sizeMap = {
  sm: {
    mark: 44,
    gap: 10,
    subtitle: 11,
  },
  md: {
    mark: 56,
    gap: 12,
    subtitle: 12,
  },
  lg: {
    mark: 72,
    gap: 14,
    subtitle: 13,
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
  const subtitleColor = inverse ? 'rgba(255,255,255,0.78)' : theme.colors.textMuted;

  const mark = (
    <View
      style={[
        styles.markWrap,
        {
          width: dims.mark,
          height: dims.mark,
          borderRadius: dims.mark * 0.22,
          backgroundColor: '#000000',
          borderWidth: inverse ? StyleSheet.hairlineWidth * 2 : 0,
          borderColor: inverse ? 'rgba(255,255,255,0.22)' : 'transparent',
          shadowColor: inverse ? '#000' : '#6E5CFF',
          shadowOpacity: inverse ? 0.35 : 0.2,
        },
      ]}
    >
      <Image source={KEEPSY_LOGO_IMAGE} style={styles.markImage} resizeMode="contain" />
    </View>
  );

  if (variant === 'mark') {
    return (
      <View style={[styles.root, { justifyContent: align === 'center' ? 'center' : 'flex-start' }]}>
        {mark}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        styles.lockupCol,
        {
          gap: dims.gap,
          alignItems: align === 'center' ? 'center' : 'flex-start',
        },
      ]}
    >
      {mark}
      {tagline ? (
        <Text style={[styles.subtitle, { fontSize: dims.subtitle, color: subtitleColor }]}>{tagline}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockupCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  markWrap: {
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  markImage: {
    width: '100%',
    height: '100%',
  },
  subtitle: {
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    maxWidth: 280,
  },
});
