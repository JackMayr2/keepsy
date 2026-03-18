import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { updateUser } from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import { BrandLogo, Page, DSButton, DSIcon, DSText, DSInput } from '@/src/design-system';

export default function ProfileOnboardingScreen() {
  const { userId, refreshAuthState } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await updateUser(userId, { bio: bio.trim() || undefined });
      await refreshAuthState();
      setLoading(false);
      router.replace('/(app)');
    } catch (e) {
      setLoading(false);
      logger.error('ProfileOnboarding', 'updateUser failed', e);
    }
  };

  const handleSkip = async () => {
    await refreshAuthState();
    router.replace('/(app)');
  };

  return (
    <Page scroll paddingTop={48} paddingHorizontal={24}>
      <BrandLogo size="sm" tagline="make it feel like you" />
      <DSText variant="titleLarge" marginBottom="$2">
        Complete your profile
      </DSText>
      <DSText variant="body" color="secondary" marginBottom="$6" lineHeight={22}>
        Optional — you can add more later in settings
      </DSText>
      <DSInput
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="A few words about you"
        multiline
        marginBottom="$6"
      />
      <YStack gap="$3">
        <DSButton
          title="Save"
          onPress={handleSave}
          loading={loading}
          icon={<DSIcon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={16} color="#FFFFFF" />}
        />
        <DSButton
          title="Skip"
          variant="ghost"
          onPress={handleSkip}
          icon={<DSIcon name={{ ios: 'forward.fill', android: 'fast_forward', web: 'fast_forward' }} size={16} color={theme.colors.text} />}
        />
      </YStack>
    </Page>
  );
}
