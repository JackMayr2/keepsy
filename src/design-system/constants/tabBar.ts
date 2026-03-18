/**
 * Bottom tab bar layout constants. Used so content padding and bar height stay in sync.
 * Best practice: fixed content height (49–56pt) + safe area inset so the bar sits above
 * the home indicator on notched devices. SafeAreaTabBar adds insets.bottom; screens use
 * TAB_BAR_CONTENT_HEIGHT + insets.bottom for scroll padding.
 */
export const TAB_BAR_CONTENT_HEIGHT = 74;
/** Vertical padding inside the tab bar (above the icon row). */
export const TAB_BAR_PADDING_TOP = 10;
