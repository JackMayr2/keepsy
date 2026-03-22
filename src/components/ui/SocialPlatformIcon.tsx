import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type SocialPlatformKey = 'instagram' | 'twitter' | 'linkedin' | string;

type SocialPlatformIconProps = {
  platform: SocialPlatformKey;
  size?: number;
  color?: string;
};

const DEFAULT_CONFIG: { name: keyof typeof MaterialCommunityIcons.glyphMap; fallbackColor: string } = {
  name: 'link-variant',
  fallbackColor: '#6B7280',
};

/** Brand-tinted icons for known platforms; generic link icon otherwise. */
const PLATFORM_ICONS: Record<
  string,
  { name: keyof typeof MaterialCommunityIcons.glyphMap; fallbackColor: string }
> = {
  instagram: { name: 'instagram', fallbackColor: '#E4405F' },
  twitter: { name: 'twitter', fallbackColor: '#1D9BF0' },
  linkedin: { name: 'linkedin', fallbackColor: '#0A66C2' },
};

export function SocialPlatformIcon({ platform, size = 22, color }: SocialPlatformIconProps) {
  const cfg = PLATFORM_ICONS[platform] ?? DEFAULT_CONFIG;
  return (
    <MaterialCommunityIcons
      name={cfg.name}
      size={size}
      color={color ?? cfg.fallbackColor}
    />
  );
}
