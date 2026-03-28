import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  View,
} from 'react-native';
import type { ApplicationVerifier } from 'firebase/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { YStack, XStack } from 'tamagui';
import { getFirebase } from '@/src/config/firebase';
import { sendPhoneCode } from '@/src/services/auth';
import { logger } from '@/src/utils/logger';
import { useTheme } from '@/src/contexts/ThemeContext';
import { BrandLogo, DSButton, DSIcon, DSText, DeferredFullscreenLoader, Page } from '@/src/design-system';

const COUNTRIES = [
  { label: 'United States', code: 'US', dialCode: '+1', digitsMax: 10 },
  { label: 'Canada', code: 'CA', dialCode: '+1', digitsMax: 10 },
  { label: 'United Kingdom', code: 'UK', dialCode: '+44', digitsMax: 10 },
  { label: 'Australia', code: 'AU', dialCode: '+61', digitsMax: 9 },
  { label: 'India', code: 'IN', dialCode: '+91', digitsMax: 10 },
] as const;
const DEFAULT_COUNTRY_INDEX = 0;
const PHONE_DIGITS_MAX = 10;

type CountryOption = (typeof COUNTRIES)[number];

function normalizePhoneInput(value: string, maxDigits: number): string {
  const digits = value.replace(/\D/g, '');
  return digits.length > maxDigits ? digits.slice(0, maxDigits) : digits;
}

function formatPhoneInput(value: string, country: CountryOption): string {
  const digits = normalizePhoneInput(value, country.digitsMax);
  if (country.dialCode === '+1') {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function getPhoneAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'We could not send your code. Please try again.';

  const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Please enter a valid phone number.';
    case 'auth/too-many-requests':
      return 'Too many attempts right now. Please wait a bit and try again.';
    case 'auth/missing-app-credential':
    case 'auth/invalid-app-credential':
      return 'Phone verification is missing a Firebase app credential. If you want captcha gone completely, enable native / Enterprise bot protection for phone auth in Firebase.';
    default:
      return error.message || 'We could not send your code. Please try again.';
  }
}

export default function PhoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string | string[] }>();
  const { theme } = useTheme();
  const recaptchaRef = useRef<FirebaseRecaptchaVerifierModal>(null);
  const [countryIndex, setCountryIndex] = useState(DEFAULT_COUNTRY_INDEX);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const selectedCountry = COUNTRIES[countryIndex];
  const initialPhone = useMemo(() => {
    const raw = Array.isArray(params.phone) ? params.phone[0] : params.phone;
    return (raw ?? '').replace(/\D/g, '');
  }, [params.phone]);
  const [phoneDigits, setPhoneDigits] = useState(initialPhone);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPhoneDigits(normalizePhoneInput(initialPhone, selectedCountry.digitsMax));
  }, [initialPhone, selectedCountry.digitsMax]);

  const fullNumber = phoneDigits ? `${selectedCountry.dialCode}${phoneDigits}` : '';
  const formattedPhone = formatPhoneInput(phoneDigits, selectedCountry);
  const canSendCode = phoneDigits.length >= 8;

  const handleSendCode = async () => {
    if (!canSendCode) {
      Alert.alert('Invalid number', 'Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      const verifier = recaptchaRef.current as unknown as ApplicationVerifier | undefined;
      await sendPhoneCode(fullNumber, verifier);
      setLoading(false);
      router.push({ pathname: '/(auth)/verify', params: { phone: fullNumber } });
    } catch (e) {
      setLoading(false);
      logger.error('PhoneScreen', 'sendPhoneCode failed', e);
      Alert.alert('Could not send code', getPhoneAuthErrorMessage(e));
    }
  };

  return (
    <>
      <Page flex={1} paddingTop={52} paddingHorizontal={28}>
        <DeferredFullscreenLoader active={loading} />
        <YStack gap="$2">
          <BrandLogo size="sm" tagline="start your chapter" />
          <DSText variant="titleLarge" marginTop="$2" letterSpacing={-0.4}>
            Enter your phone number
          </DSText>
          <DSText variant="body" color="secondary" lineHeight={22}>
            We&apos;ll text you a 6-digit code.
          </DSText>
        </YStack>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'position' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={styles.bottomAvoider}
        >
          <YStack gap="$3" marginBottom="$6">
            <DSText variant="label" color="secondary">
              Phone number
            </DSText>
            <View
              style={[
                styles.phoneFieldShell,
                {
                  backgroundColor: theme.colors.surfaceGlass,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Pressable
                onPress={() => setCountryModalVisible(true)}
                style={({ pressed }) => [
                  styles.countryButton,
                  {
                    borderRightColor: theme.colors.borderMuted,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <DSText variant="body" style={styles.countryCodeText}>
                  {selectedCountry.dialCode}
                </DSText>
                <DSIcon
                  name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' }}
                  size={14}
                  color={theme.colors.textMuted}
                />
              </Pressable>
              <TextInput
                style={[
                  styles.phoneInput,
                  {
                    color: theme.colors.text,
                  },
                ]}
                placeholder="(555) 123-4567"
                placeholderTextColor={theme.colors.textMuted}
                value={formattedPhone}
                onChangeText={(value) =>
                  setPhoneDigits(normalizePhoneInput(value, selectedCountry.digitsMax))
                }
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                returnKeyType="done"
                onSubmitEditing={handleSendCode}
                autoFocus
                selectionColor={theme.colors.primary}
              />
            </View>
          </YStack>

          <DSButton
            title="Text me a code"
            onPress={handleSendCode}
            loading={loading}
            disabled={!canSendCode}
            icon={<DSIcon name={{ ios: 'paperplane.fill', android: 'send', web: 'send' }} size={16} color="#FFFFFF" />}
          />

          <DSText variant="caption" color="muted" marginTop="$3" textAlign="center">
            Standard messaging rates may apply.
          </DSText>
        </KeyboardAvoidingView>
      </Page>
      <Modal
        visible={countryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: 'rgba(8, 10, 18, 0.45)' }]}
          onPress={() => setCountryModalVisible(false)}
        >
          <Pressable
            onPress={() => {}}
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderMuted,
              },
            ]}
          >
            <DSText variant="label" color="secondary" marginBottom="$2">
              Select country code
            </DSText>
            <YStack gap="$1">
              {COUNTRIES.map((country, index) => {
                const selected = index === countryIndex;
                return (
                  <Pressable
                    key={country.code}
                    onPress={() => {
                      setCountryIndex(index);
                      setPhoneDigits((prev) =>
                        normalizePhoneInput(prev, COUNTRIES[index].digitsMax)
                      );
                      setCountryModalVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.countryOption,
                      {
                        backgroundColor: selected
                          ? theme.colors.surfaceSecondary
                          : 'transparent',
                        opacity: pressed ? 0.82 : 1,
                      },
                    ]}
                  >
                    <XStack alignItems="center" justifyContent="space-between">
                      <DSText variant="body">{country.label}</DSText>
                      <XStack alignItems="center" gap="$2">
                        <DSText variant="body" color="secondary">
                          {country.dialCode}
                        </DSText>
                        {selected ? (
                          <DSIcon
                            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                            size={14}
                            color={theme.colors.primary}
                          />
                        ) : null}
                      </XStack>
                    </XStack>
                  </Pressable>
                );
              })}
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={getFirebase().options}
        title="Secure sign in"
        attemptInvisibleVerification
      />
    </>
  );
}

const styles = StyleSheet.create({
  phoneFieldShell: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  countryButton: {
    minWidth: 82,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    gap: 4,
    paddingHorizontal: 8,
  },
  countryCodeText: {
    letterSpacing: 0.1,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  modalCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  countryOption: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  bottomAvoider: {
    marginTop: 'auto',
  },
});
