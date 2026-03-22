import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  TextInput,
  ViewStyle,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Text } from './Text';
import {
  toISODateString,
  formatDueDateLabel,
  parseDueDateForPicker,
  addMonths,
} from '@/src/utils/dateFormat';

export type DatePickerFieldProps = {
  label?: string;
  /** Stored as `YYYY-MM-DD` when picked from calendar */
  value: string;
  onChange: (isoDateString: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  /** Earliest selectable date (inclusive) */
  minimumDate?: Date;
  /** Latest selectable date (inclusive) */
  maximumDate?: Date;
};

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select a date',
  containerStyle,
  minimumDate,
  maximumDate,
}: DatePickerFieldProps) {
  const { theme, colorScheme } = useTheme();
  const { colors, spacing, radii } = theme;

  const fallback = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const selectedDate = useMemo(
    () => parseDueDateForPicker(value, fallback),
    [value, fallback]
  );

  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState(() => selectedDate);
  const [androidOpen, setAndroidOpen] = useState(false);

  /** Keep draft in sync when parent value changes (modal closed). */
  useEffect(() => {
    if (!iosOpen) {
      setIosDraft(selectedDate);
    }
  }, [selectedDate, iosOpen]);

  const displayLabel = value.trim() ? formatDueDateLabel(value) : '';

  const openPicker = () => {
    if (Platform.OS === 'web') return;
    setIosDraft(selectedDate);
    if (Platform.OS === 'ios') {
      setIosOpen(true);
    } else {
      setAndroidOpen(true);
    }
  };

  const dateFromAndroidEvent = (event: DateTimePickerEvent, date?: Date): Date | null => {
    if (date != null && !Number.isNaN(date.getTime())) return date;
    const ts = (event as { nativeEvent?: { timestamp?: number } }).nativeEvent?.timestamp;
    if (ts != null && !Number.isNaN(ts)) {
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  };

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setAndroidOpen(false);
    if (event.type === 'dismissed') return;
    const next = dateFromAndroidEvent(event, date);
    if (next) onChange(toISODateString(next));
  };

  const commitIOSAndClose = () => {
    onChange(toISODateString(iosDraft));
    setIosOpen(false);
  };

  const cancelIOS = () => {
    setIosOpen(false);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <Text variant="label" color="secondary" style={[styles.label, { marginBottom: theme.spacing.xs }]}>
            {label}
          </Text>
        ) : null}
        <TextInput
          style={[
            styles.webInput,
            {
              backgroundColor: colors.surfaceGlass,
              borderColor: colors.border,
              borderRadius: radii.lg,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 6,
              color: colors.text,
              borderWidth: 1.5,
            },
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
        />
        <Text variant="caption" color="secondary" style={styles.webHint}>
          Use YYYY-MM-DD (e.g. {toISODateString(addMonths(fallback, 1))})
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text variant="label" color="secondary" style={[styles.label, { marginBottom: theme.spacing.xs }]}>
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: colors.surfaceGlass,
            borderColor: colors.border,
            borderRadius: radii.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 6,
            opacity: pressed ? 0.85 : 1,
            borderWidth: 1.5,
          },
        ]}
      >
        <Text
          variant="body"
          style={{ color: displayLabel ? colors.text : colors.textMuted }}
        >
          {displayLabel || placeholder}
        </Text>
      </Pressable>

      {Platform.OS === 'android' && androidOpen ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="calendar"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={onAndroidChange}
        />
      ) : null}

      <Modal visible={iosOpen} animationType="slide" transparent>
        {/* Backdrop + sheet as siblings so touches reach UIDatePicker (nested Pressable breaks the wheels). */}
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={commitIOSAndClose} accessibilityLabel="Save date and close" />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.borderMuted },
              ]}
            >
              <Pressable
                onPress={cancelIOS}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
                style={({ pressed }) => [styles.headerSideBtn, { opacity: pressed ? 0.65 : 1 }]}
              >
                <Text variant="body" style={{ fontSize: 17, color: colors.textSecondary }}>
                  Cancel
                </Text>
              </Pressable>
              <Text
                variant="label"
                numberOfLines={1}
                style={[styles.headerTitle, { color: colors.text }]}
              >
                Due date
              </Text>
              <Pressable
                onPress={commitIOSAndClose}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
                style={({ pressed }) => [styles.headerSideBtn, styles.headerDoneWrap, { opacity: pressed ? 0.75 : 1 }]}
              >
                <Text variant="body" style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>
                  Done
                </Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={iosDraft}
              mode="date"
              display="spinner"
              themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                if (date != null && !Number.isNaN(date.getTime())) {
                  setIosDraft(date);
                  return;
                }
                const ts = event.nativeEvent?.timestamp;
                if (ts != null && !Number.isNaN(ts)) {
                  const d = new Date(ts);
                  if (!Number.isNaN(d.getTime())) setIosDraft(d);
                }
              }}
              style={styles.iosPicker}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 16 },
  label: {},
  field: {
    minHeight: 56,
    justifyContent: 'center',
  },
  webInput: {
    minHeight: 56,
    fontSize: 16,
  },
  webHint: { marginTop: 6 },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
    zIndex: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSideBtn: {
    minWidth: 76,
    paddingVertical: 14,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerDoneWrap: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
  iosPicker: { alignSelf: 'center', width: '100%' },
});
