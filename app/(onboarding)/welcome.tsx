import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { createUser } from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import { Container, Button, Input, Text } from '@/src/components/ui';

export default function WelcomeScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
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
      style={styles.flex}
    >
      <Container scroll style={styles.content}>
        <Text variant="titleLarge" style={styles.title}>
          Welcome to Keepsy
        </Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          Tell us a bit about you
        </Text>
        <Input
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          autoCapitalize="words"
        />
        <Input
          label="Last name"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
          autoCapitalize="words"
        />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!valid}
          loading={loading}
          style={styles.button}
        />
      </Container>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 28, paddingTop: 52 },
  title: { marginBottom: 10, letterSpacing: -0.3 },
  subtitle: { marginBottom: 28, lineHeight: 22 },
  button: { marginTop: 28 },
});
