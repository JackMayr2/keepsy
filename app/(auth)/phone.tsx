import React, { useRef, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { YStack, XStack } from 'tamagui';
import { getFirebase } from '@/src/config/firebase';
import { sendPhoneCode } from '@/src/services/auth';
import { logger } from '@/src/utils/logger';
import { AnimatedBlobBackground } from '@/src/components/AnimatedBlobBackground';
import { BrandLogo, DSButton, DSIcon, DSText, DSInput, DeferredFullscreenLoader } from '@/src/design-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_COUNTRY = '+1';

export default function PhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        style={[styles.flex, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <DeferredFullscreenLoader active={loading} />
        <YStack flex={1} justifyContent="center" paddingHorizontal={28} paddingBottom={40}>
          <BrandLogo
            size="md"
            tagline="private yearbooks for your people"
          />
          <DSText variant="titleLarge" marginBottom="$2" letterSpacing={-0.4}>
            Enter your number
          </DSText>
          <DSText variant="body" color="secondary" marginBottom="$6" lineHeight={22}>
            We’ll send you a verification code
          </DSText>
          <XStack alignItems="center" gap="$3" marginBottom="$6">
            <YStack
              minWidth={52}
              height={52}
              borderRadius={14}
              backgroundColor="$backgroundStrong"
              borderWidth={1.5}
              borderColor="$borderColor"
              justifyContent="center"
              alignItems="center"
            >
              <DSText variant="body">{DEFAULT_COUNTRY}</DSText>
            </YStack>
            <YStack flex={1}>
              <DSInput
                placeholder="Phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </YStack>
          </XStack>
          <DSButton
            title="Send code"
            onPress={handleSendCode}
            loading={loading}
            icon={<DSIcon name={{ ios: 'paperplane.fill', android: 'send', web: 'send' }} size={16} color="#FFFFFF" />}
          />
        </YStack>
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
});
