import { Platform } from 'react-native';

/**
 * Standard scroll behavior across the app: no visible scrollbars, native bounce,
 * and consistent keyboard handling. Use for ScrollView and FlatList.
 */
export const standardScrollViewProps = {
  showsVerticalScrollIndicator: false as const,
  showsHorizontalScrollIndicator: false as const,
  bounces: true,
  overScrollMode: 'always' as const,
  alwaysBounceVertical: true,
  keyboardShouldPersistTaps: 'handled' as const,
  ...(Platform.OS === 'ios' && {
    contentInsetAdjustmentBehavior: 'never' as const,
  }),
};

/** Same as standardScrollViewProps for use with FlatList. */
export const standardFlatListScrollProps = {
  showsVerticalScrollIndicator: false as const,
  showsHorizontalScrollIndicator: false as const,
  bounces: true,
  overScrollMode: 'always' as const,
  keyboardShouldPersistTaps: 'handled' as const,
};
