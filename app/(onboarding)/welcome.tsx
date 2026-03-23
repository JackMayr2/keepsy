import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { useAuth } from '@/src/contexts/AuthContext';
import { createUser } from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import {
  BrandLogo,
  Page,
  DSButton,
  DSIcon,
  DSText,
  DSInput,
  DeferredFullscreenLoader,
} from '@/src/design-system';
import { PlaceAutocomplete, type ResolvedPlace } from '@/src/components/ui';

export default function WelcomeScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [cityText, setCityText] = useState('');
  const [homePlace, setHomePlace] = useState<ResolvedPlace | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    if (!userId) return;
    setLoading(true);
    try {
      await createUser(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        ...(cityText.trim() ? { city: cityText.trim() } : {}),
        ...(homePlace
          ? { homeLatitude: homePlace.latitude, homeLongitude: homePlace.longitude }
          : {}),
      });
      setLoading(false);
      router.push('/(onboarding)/profile');
    } catch (e) {
      setLoading(false);
      logger.error('WelcomeScreen', 'createUser failed', e);
    }
  };

  const valid = firstName.trim() && lastName.trim() && email.trim();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <Page scroll paddingTop={52} paddingHorizontal={28}>
        <DeferredFullscreenLoader active={loading} />
        <BrandLogo size="sm" tagline="start your chapter" />
        <DSText variant="titleLarge" marginBottom="$2" letterSpacing={-0.4}>
          Welcome to Keepsy
        </DSText>
        <DSText variant="body" color="secondary" marginBottom="$6" lineHeight={22}>
          Tell us a bit about you
        </DSText>
        <YStack gap="$4" marginBottom="$6">
          <DSInput
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            autoCapitalize="words"
          />
          <DSInput
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            autoCapitalize="words"
          />
          <DSInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <PlaceAutocomplete
            label="Home city (optional)"
            placeholder="Search for your city"
            value={cityText}
            onChangeText={setCityText}
            onResolvedPlaceChange={setHomePlace}
            containerStyle={{ marginBottom: 4 }}
          />
        </YStack>
        <DSButton
          title="Continue"
          onPress={handleContinue}
          disabled={!valid}
          loading={loading}
          icon={<DSIcon name={{ ios: 'arrow.right.circle.fill', android: 'arrow_forward', web: 'arrow_forward' }} size={16} color="#FFFFFF" />}
        />
      </Page>
    </KeyboardAvoidingView>
  );
}
