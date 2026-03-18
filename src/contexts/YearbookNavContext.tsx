import React, { createContext, useContext, useState, useCallback } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

type YearbookNavContextValue = {
  navVisible: boolean;
  setNavVisible: (visible: boolean) => void;
};

const YearbookNavContext = createContext<YearbookNavContextValue | null>(null);

export function YearbookNavProvider({ children }: { children: React.ReactNode }) {
  const [navVisible, setNavVisible] = useState(true);
  return (
    <YearbookNavContext.Provider value={{ navVisible, setNavVisible }}>
      {children}
    </YearbookNavContext.Provider>
  );
}

export function useYearbookNav(): YearbookNavContextValue {
  const ctx = useContext(YearbookNavContext);
  if (!ctx) {
    return {
      navVisible: true,
      setNavVisible: () => {},
    };
  }
  return ctx;
}

/**
 * Yearbook navigation is intentionally pinned on-screen so members can always switch tabs.
 * We still return a stable onScroll handler to preserve the screen interfaces.
 */
export function useScrollToHideNav(opts?: { thresholdHide?: number; thresholdShow?: number }) {
  const { setNavVisible } = useYearbookNav();

  void opts;

  const onScroll = useCallback(
    (_e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setNavVisible(true);
    },
    [setNavVisible]
  );

  return { onScroll, scrollEventThrottle: 24 };
}
