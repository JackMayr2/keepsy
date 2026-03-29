import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type PageSelectedEvent = { nativeEvent: { position: number } };

type Props = {
  style?: StyleProp<ViewStyle>;
  initialPage?: number;
  onPageSelected?: (e: PageSelectedEvent) => void;
  scrollEnabled?: boolean;
  children?: React.ReactNode;
};

/**
 * Web-safe horizontal pager. Matches a subset of react-native-pager-view used in the app.
 */
export default function NativePagerView({
  style,
  initialPage = 0,
  onPageSelected,
  scrollEnabled = true,
  children,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const pages = React.Children.toArray(children);

  useEffect(() => {
    if (pageWidth <= 0 || pages.length === 0) return;
    const page = Math.min(Math.max(0, initialPage), pages.length - 1);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: page * pageWidth, animated: false });
    });
  }, [initialPage, pageWidth, pages.length]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setPageWidth(w);
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageWidth <= 0 || pages.length === 0) return;
      const x = e.nativeEvent.contentOffset.x;
      const position = Math.round(x / pageWidth);
      const clamped = Math.max(0, Math.min(pages.length - 1, position));
      onPageSelected?.({ nativeEvent: { position: clamped } });
    },
    [pageWidth, pages.length, onPageSelected]
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      scrollEnabled={scrollEnabled}
      style={style}
      onLayout={onLayout}
      onMomentumScrollEnd={onMomentumScrollEnd}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      {pageWidth > 0
        ? pages.map((child, i) => (
            <View key={i} style={{ width: pageWidth }}>
              {child}
            </View>
          ))
        : null}
    </ScrollView>
  );
}
