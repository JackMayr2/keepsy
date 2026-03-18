import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { verifyCode } from '@/src/services/auth';
import { logger } from '@/src/utils/logger';
import { useTheme } from '@/src/contexts/ThemeContext';
import { AnimatedBlobBackground } from '@/src/components/AnimatedBlobBackground';
import { BrandLogo, DSIcon } from '@/src/design-system';
import { Container, Button, Text } from '@/src/components/ui';

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { theme } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      const message = e instanceof Error ? e.message : 'Invalid code';
      logger.error('VerifyScreen', 'verifyCode failed', e);
      Alert.alert('Error', message);
    }
  };

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
  };

  return (
    <View style={styles.wrapper}>
      <AnimatedBlobBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <Container style={styles.content}>
          <BrandLogo size="sm" tagline="verify your invite" />
          <Text variant="titleLarge" style={styles.title}>
            Enter the code
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Sent to {phone ?? 'your number'}
          </Text>
          <Pressable style={styles.codeRow} onPress={() => inputRef.current?.focus()}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <View key={i} style={[styles.digitBox, { borderColor: theme.colors.border }]}>
                <Text variant="title">{code[i] ?? ''}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleChangeText}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            style={styles.hiddenInput}
          />
          <Button
            title="Verify"
            onPress={handleVerify}
            loading={loading}
            disabled={code.length !== CODE_LENGTH}
            icon={<DSIcon name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'check_circle' }} size={16} color="#FFFFFF" />}
            style={styles.button}
          />
        </Container>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: { marginBottom: 10 },
  subtitle: { marginBottom: 28 },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  digitBox: {
    width: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  button: { marginTop: 8 },
});
