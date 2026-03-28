import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { verifyCode } from '@/src/services/auth';
import { logger } from '@/src/utils/logger';
import { useTheme } from '@/src/contexts/ThemeContext';
import { BrandLogo, DSButton, DSIcon, DSText, DeferredFullscreenLoader, Page } from '@/src/design-system';

const CODE_LENGTH = 6;

function formatPhoneForDisplay(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return 'your number';

  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }
  return raw;
}

function getVerifyErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'That code did not work. Please try again.';

  const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-verification-code':
      return 'That code does not match. Check the latest text and try again.';
    case 'auth/code-expired':
      return 'That code expired. Go back and request a fresh one.';
    default:
      return error.message || 'That code did not work. Please try again.';
  }
}

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const phoneLabel = formatPhoneForDisplay(phone);

  useEffect(() => {
    inputRef.current?.focus();
  }, [phone]);

  const hasVerified = useRef(false);
  useEffect(() => {
    if (code.length < CODE_LENGTH) hasVerified.current = false;
    if (code.length === CODE_LENGTH && !hasVerified.current) {
      hasVerified.current = true;
      handleVerify();
    }
  }, [code]);

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH) return;
    setLoading(true);
    try {
      await verifyCode(code);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      logger.error('VerifyScreen', 'verifyCode failed', e);
      hasVerified.current = false;
      setCode('');
      inputRef.current?.focus();
      Alert.alert('Could not verify code', getVerifyErrorMessage(e));
    }
  };

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
  };

  return (
    <Page flex={1} paddingTop={52} paddingHorizontal={28}>
      <DeferredFullscreenLoader active={loading} />
      <YStack gap="$2">
        <BrandLogo size="sm" tagline="step into the circle" />
        <DSText variant="titleLarge" marginTop="$2" marginBottom="$1">
          Enter verification code
        </DSText>
        <DSText variant="body" color="secondary" lineHeight={22}>
          Sent to {phoneLabel}
        </DSText>
      </YStack>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.bottomAvoider}
      >
        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={styles.codeTapArea}
        >
          <View style={styles.codeRow}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const filled = Boolean(code[i]);
              return (
                <View
                  key={i}
                  style={[
                    styles.digitBox,
                    {
                      borderColor: filled ? theme.colors.primary : theme.colors.border,
                      backgroundColor: filled
                        ? theme.colors.surfaceSecondary
                        : theme.colors.surface,
                    },
                  ]}
                >
                  <DSText variant="title" lineHeight={24}>
                    {code[i] ?? ''}
                  </DSText>
                </View>
              );
            })}
          </View>
        </Pressable>

        <DSText variant="caption" color="muted" textAlign="center" lineHeight={18} marginTop="$3">
          Type the 6-digit code from your text message.
        </DSText>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={CODE_LENGTH}
          style={styles.hiddenInput}
        />

        <YStack gap="$3" marginTop="$6">
          <DSButton
            title="Verify"
            onPress={handleVerify}
            loading={loading}
            disabled={code.length !== CODE_LENGTH}
            icon={<DSIcon name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'check_circle' }} size={16} color="#FFFFFF" />}
          />
          <DSButton
            title="Use a different number"
            variant="ghost"
            onPress={() =>
              router.replace({
                pathname: '/(auth)/phone',
                params: phone ? { phone } : {},
              })
            }
            icon={<DSIcon name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={16} color={theme.colors.text} />}
          />
        </YStack>
      </KeyboardAvoidingView>
    </Page>
  );
}

const styles = StyleSheet.create({
  codeTapArea: {
    paddingVertical: 2,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  digitBox: {
    width: 46,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  bottomAvoider: {
    marginTop: 'auto',
  },
});
