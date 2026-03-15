/**
 * Tamagui config – single source of truth for design tokens.
 * Edit this file to change colors, spacing, radius, typography app-wide.
 */
import { config as defaultConfig } from '@tamagui/config';
import { createTamagui } from 'tamagui';

export const config = createTamagui(defaultConfig);

export type Conf = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
