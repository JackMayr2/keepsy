import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Keyboard,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { KeepsyBookLoader } from '@/src/design-system';
import { searchPlaces, type PlaceSuggestion } from '@/src/services/placesSearch';
import { Text } from './Text';

const DEBOUNCE_MS = 320;

export type ResolvedPlace = {
  label: string;
  latitude: number;
  longitude: number;
};

export type PlaceAutocompleteProps = {
  label?: string;
  placeholder?: string;
  /** Current text in the field */
  value: string;
  onChangeText: (text: string) => void;
  /** Called when user picks a suggestion (accurate coordinates) or when text no longer matches a prior selection */
  onResolvedPlaceChange: (place: ResolvedPlace | null) => void;
  containerStyle?: ViewStyle;
  /** Show OSM attribution footnote */
  showAttribution?: boolean;
  /**
   * When true (default), editing the text after choosing a suggestion clears the resolved place (for profile/home).
   * Set false for trip flows where coordinates may come from photo EXIF and should not be cleared while typing.
   */
  invalidateResolvedWhenTextChanges?: boolean;
  /** When the parent already has a resolved place (e.g. loaded profile), keep invalidation in sync */
  syncedResolvedPlace?: ResolvedPlace | null;
};

export function PlaceAutocomplete({
  label,
  placeholder = 'Search for a city or place',
  value,
  onChangeText,
  onResolvedPlaceChange,
  containerStyle,
  showAttribution = true,
  invalidateResolvedWhenTextChanges = true,
  syncedResolvedPlace,
}: PlaceAutocompleteProps) {
  const { theme } = useTheme();
  const { colors, spacing, radii } = theme;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const lastResolvedRef = useRef<ResolvedPlace | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const clearDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const invalidateIfTextChanged = useCallback(
    (text: string) => {
      if (!invalidateResolvedWhenTextChanges) return;
      const resolved = lastResolvedRef.current;
      if (resolved && text.trim() !== resolved.label.trim()) {
        lastResolvedRef.current = null;
        onResolvedPlaceChange(null);
      }
    },
    [invalidateResolvedWhenTextChanges, onResolvedPlaceChange]
  );

  const handleChangeText = (text: string) => {
    invalidateIfTextChanged(text);
    onChangeText(text);
    clearDebounce();
    if (text.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const id = ++requestIdRef.current;
      const results = await searchPlaces(text);
      if (id !== requestIdRef.current) return;
      setSuggestions(results);
      setLoading(false);
    }, DEBOUNCE_MS);
  };

  const handleSelect = (item: PlaceSuggestion) => {
    clearDebounce();
    Keyboard.dismiss();
    setOpen(false);
    setSuggestions([]);
    const resolved: ResolvedPlace = {
      label: item.label,
      latitude: item.latitude,
      longitude: item.longitude,
    };
    lastResolvedRef.current = resolved;
    onChangeText(item.label);
    onResolvedPlaceChange(resolved);
  };

  useEffect(() => () => clearDebounce(), []);

  useEffect(() => {
    if (syncedResolvedPlace === undefined) return;
    if (!syncedResolvedPlace) {
      lastResolvedRef.current = null;
      return;
    }
    if (value.trim() === syncedResolvedPlace.label.trim()) {
      lastResolvedRef.current = syncedResolvedPlace;
    }
  }, [syncedResolvedPlace, value]);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Text variant="label" color="secondary" style={[styles.label, { marginBottom: theme.spacing.xs }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceGlass,
            borderColor: colors.border,
            borderRadius: radii.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 6,
            minHeight: 56,
            fontSize: theme.typography.fontSize.base,
            color: colors.text,
            borderWidth: 1.5,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={handleChangeText}
        onFocus={() => {
          if (value.trim().length >= 2) setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 200);
        }}
        selectionColor={colors.primary}
        autoCorrect={false}
      />
      {open && (loading || suggestions.length > 0) ? (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.lg,
            },
          ]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <KeepsyBookLoader size={28} />
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={styles.list}
              showsVerticalScrollIndicator={false}
            >
              {suggestions.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    {
                      borderBottomColor: colors.borderMuted,
                      opacity: pressed ? 0.75 : 1,
                      borderBottomWidth: index === suggestions.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text variant="body" numberOfLines={2}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}
      {showAttribution ? (
        <Text variant="caption" color="secondary" style={styles.attribution}>
          Place search: OpenStreetMap / Photon
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    zIndex: 20,
  },
  label: {},
  input: {},
  dropdown: {
    marginTop: 6,
    maxHeight: 220,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  list: { maxHeight: 220 },
  loadingRow: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  suggestionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  attribution: {
    marginTop: 6,
    opacity: 0.75,
  },
});
