import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { updateUser } from '@/src/services/firestore';
import { uploadProfileImage } from '@/src/services/storage';
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

const AVATAR_SIZE = 104;

export default function ProfileOnboardingScreen() {
  const { userId, refreshAuthState } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [bio, setBio] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({
    instagram: '',
    twitter: '',
    linkedin: '',
  });
  const [loading, setLoading] = useState(false);

  const finishOnboarding = async () => {
    await refreshAuthState();
    router.replace('/(app)');
  };

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const links: Record<string, string> = {};
      for (const [key, value] of Object.entries(socialLinks)) {
        const next = value.trim();
        if (next) links[key] = next;
      }
      let uploadedPhotoUrl: string | undefined;
      if (photoUri) {
        uploadedPhotoUrl = await uploadProfileImage(userId, photoUri);
      }
      await updateUser(userId, {
        bio: bio.trim() || undefined,
        photoURL: uploadedPhotoUrl,
        socialLinks: Object.keys(links).length > 0 ? links : undefined,
      });
      await finishOnboarding();
    } catch (e) {
      logger.error('ProfileOnboarding', 'updateUser failed', e);
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  return (
    <Page scroll paddingTop={48} paddingHorizontal={24}>
      <DeferredFullscreenLoader active={loading} />
      <BrandLogo size="sm" tagline="make it feel like you" />
      <DSText variant="titleLarge" marginBottom="$2">
        Complete your profile
      </DSText>
      <DSText variant="body" color="secondary" marginBottom="$6" lineHeight={22}>
        Add a photo and socials now, or finish this later in settings.
      </DSText>

      <View style={styles.avatarSection}>
        <Pressable
          onPress={pickProfileImage}
          disabled={loading}
          style={({ pressed }) => [styles.avatarTouch, { opacity: pressed ? 0.82 : 1 }]}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.borderMuted }]}>
              <DSText variant="caption" color="secondary">
                Add photo
              </DSText>
            </View>
          )}
        </Pressable>
        <DSText variant="caption" color="secondary" marginTop="$2">
          Tap to upload profile picture
        </DSText>
      </View>

      <DSInput
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="A few words about you"
        multiline
        marginBottom="$4"
      />
      <YStack gap="$4" marginBottom="$6">
        <DSInput
          label="Instagram (optional)"
          value={socialLinks.instagram}
          onChangeText={(text) => setSocialLinks((prev) => ({ ...prev, instagram: text }))}
          placeholder="username or profile URL"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <DSInput
          label="Twitter / X (optional)"
          value={socialLinks.twitter}
          onChangeText={(text) => setSocialLinks((prev) => ({ ...prev, twitter: text }))}
          placeholder="username or profile URL"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <DSInput
          label="LinkedIn (optional)"
          value={socialLinks.linkedin}
          onChangeText={(text) => setSocialLinks((prev) => ({ ...prev, linkedin: text }))}
          placeholder="profile URL"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </YStack>
      <YStack gap="$3">
        <DSButton
          title="Finish setup"
          onPress={handleSave}
          loading={loading}
          icon={<DSIcon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={16} color="#FFFFFF" />}
        />
        <DSButton
          title="Skip for now"
          variant="ghost"
          onPress={handleSkip}
          disabled={loading}
          icon={<DSIcon name={{ ios: 'forward.fill', android: 'fast_forward', web: 'fast_forward' }} size={16} color={theme.colors.text} />}
        />
      </YStack>
    </Page>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarTouch: {
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
