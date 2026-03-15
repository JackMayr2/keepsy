'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Theme } from '@/src/theme/light';
import { lightTheme, darkTheme } from '@/src/theme/light';

export type ColorScheme = 'light' | 'dark';

const COLOR_SCHEME_KEY = 'keepsy_color_scheme';

type ThemeContextValue = {
  colorScheme: ColorScheme;
  theme: Theme;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(COLOR_SCHEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setColorSchemeState(stored);
      setHydrated(true);
    });
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    AsyncStorage.setItem(COLOR_SCHEME_KEY, scheme);
  }, []);

  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({ colorScheme, theme, setColorScheme }),
    [colorScheme, setColorScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
