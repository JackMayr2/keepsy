import React, { useRef, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { getFirebase } from '@/src/config/firebase';
import { sendPhoneCode } from '@/src/services/auth';
import { logger } from '@/src/utils/logger';
import { AnimatedBlobBackground } from '@/src/components/AnimatedBlobBackground';
import { Container, Button, Input, Text } from '@/src/components/ui';

const DEFAULT_COUNTRY = '+1';

export default function PhoneScreen() {
  const router = useRouter();
  const recaptchaRef = useRef<FirebaseRecaptchaVerifierModal>(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const fullNumber = phone.startsWith('+') ? phone : `${DEFAULT_COUNTRY}${phone.replace(/\D/g, '')}`;

  const handleSendCode = async () => {
    if (!fullNumber || fullNumber.length < 10) {
      Alert.alert('Invalid number', 'Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      const verifier = recaptchaRef.current;
      if (!verifier) {
        Alert.alert('Error', 'Verification not ready. Try again.');
        setLoading(false);
        return;
      }
      await sendPhoneCode(fullNumber, verifier as never);
      setLoading(false);
      router.push({ pathname: '/(auth)/verify', params: { phone: fullNumber } });
    } catch (e) {
      setLoading(false);
      const message = e instanceof Error ? e.message : 'Failed to send code';
      logger.error('PhoneScreen', 'sendPhoneCode failed', e);
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={styles.wrapper}>
      <AnimatedBlobBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <Container style={styles.content}>
          <Text variant="titleLarge" style={styles.title}>
            Enter your number
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            We’ll send you a verification code
          </Text>
          <View style={styles.inputRow}>
            <View style={styles.countryCode}>
              <Text variant="body">{DEFAULT_COUNTRY}</Text>
            </View>
            <Input
              placeholder="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              containerStyle={styles.phoneInput}
            />
          </View>
          <Button
            title="Send code"
            onPress={handleSendCode}
            loading={loading}
            style={styles.button}
          />
        </Container>
      </KeyboardAvoidingView>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={getFirebase().options}
        title="Verify you're human"
      />
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
  title: { marginBottom: 10, letterSpacing: -0.3 },
  subtitle: { marginBottom: 28, lineHeight: 22 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  countryCode: { marginRight: 14 },
  phoneInput: { flex: 1 },
  button: { marginTop: 14 },
});
