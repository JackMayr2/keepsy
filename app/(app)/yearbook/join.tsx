import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { joinYearbookByCode } from '@/src/services/firestore';
import { logger } from '@/src/utils/logger';
import { BrandLogo, DSIcon, DeferredFullscreenLoader } from '@/src/design-system';
import { Container, Button, Input, Text } from '@/src/components/ui';

export default function JoinYearbookScreen() {
  const { userId, pendingJoinCode, setPendingJoinCode } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prefill = params.code ?? pendingJoinCode ?? '';
    if (prefill) {
      setCode(prefill.toUpperCase().trim());
      if (pendingJoinCode) setPendingJoinCode(null);
    }
  }, [params.code, pendingJoinCode, setPendingJoinCode]);

  const handleJoin = async () => {
    if (!code.trim() || !userId) return;
    setLoading(true);
    try {
      const result = await joinYearbookByCode(code.trim(), userId);
      setLoading(false);
      if ('error' in result) {
        Alert.alert('Couldn’t join', result.error);
        return;
      }
      router.replace({ pathname: '/(app)/yearbook/[id]', params: { id: result.yearbookId } });
    } catch (e) {
      setLoading(false);
      logger.error('JoinYearbook', 'joinYearbookByCode failed', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to join');
    }
  };

  return (
    <Container scroll style={styles.content}>
      <DeferredFullscreenLoader active={loading} />
      <BrandLogo size="sm" tagline="step into the circle" />
      <Text variant="titleLarge" style={styles.title}>
        Join yearbook
      </Text>
      <Text variant="body" color="secondary" style={styles.subtitle}>
        Enter the 8-character invite code
      </Text>
      <Input
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
        placeholder="XXXXXXXX"
        autoCapitalize="characters"
        maxLength={8}
        containerStyle={styles.input}
      />
      <Button
        title="Join"
        onPress={handleJoin}
        disabled={code.length !== 8}
        loading={loading}
        icon={<DSIcon name={{ ios: 'person.badge.plus', android: 'group_add', web: 'person_add' }} size={16} color="#FFFFFF" />}
        style={styles.button}
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24 },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 24 },
  input: { marginBottom: 24 },
  button: {},
});
