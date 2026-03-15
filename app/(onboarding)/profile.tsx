import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { updateUser } from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import { Container, Button, Input, Text } from '@/src/components/ui';

export default function ProfileOnboardingScreen() {
  const { userId, refreshAuthState } = useAuth();
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
    <Container scroll style={styles.content}>
      <Text variant="titleLarge" style={styles.title}>
        Complete your profile
      </Text>
      <Text variant="body" color="secondary" style={styles.subtitle}>
        Optional — you can add more later in settings
      </Text>
      <Input
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="A few words about you"
        multiline
      />
      <Button title="Save" onPress={handleSave} loading={loading} style={styles.button} />
      <Button title="Skip for now" variant="ghost" onPress={handleSkip} style={styles.skip} />
    </Container>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 48 },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 24 },
  button: { marginTop: 24 },
  skip: { marginTop: 12 },
});
