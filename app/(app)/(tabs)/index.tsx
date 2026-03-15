import React, { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Spinner } from 'tamagui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbooks } from '@/src/hooks/useYearbooks';
import { leaveYearbook } from '@/src/services/firestore';
import { Page, Header, DSButton, DSText } from '@/src/design-system';
import { YearbookCard } from '@/src/components/YearbookCard';

export default function HomeScreen() {
  const { userId, pendingJoinCode } = useAuth();
  const router = useRouter();
  const { yearbooks, loading, error, refresh } = useYearbooks(userId);

  useEffect(() => {
    if (pendingJoinCode) {
      router.replace({ pathname: '/(app)/yearbook/join', params: { code: pendingJoinCode } });
    }
  }, [pendingJoinCode]);

  const handleLeave = useCallback(
    (yearbookId: string, name: string) => {
      if (!userId) return;
      Alert.alert(
        'Leave yearbook?',
        `You will leave "${name}". You can rejoin with an invite code.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              await leaveYearbook(yearbookId, userId);
              refresh();
            },
          },
        ]
      );
    },
    [userId, refresh]
  );

  if (loading) {
    return (
      <Page flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </Page>
    );
  }

  if (error) {
    return (
      <Page flex={1} justifyContent="center" alignItems="center">
        <DSText variant="body" color="secondary" textAlign="center">
          Something went wrong. Pull to try again.
        </DSText>
        <DSText variant="caption" color="secondary" textAlign="center" marginTop="$2" paddingHorizontal="$6">
          {error.message}
        </DSText>
        <DSButton title="Retry" onPress={refresh} variant="outline" marginTop="$5" />
      </Page>
    );
  }

  return (
    <Page scroll>
      <Header
        title="My Yearbooks"
        right={
          <XStack gap="$3">
            <DSButton
              title="Join"
              variant="outline"
              onPress={() => router.push('/(app)/yearbook/join')}
            />
            <DSButton
              title="Create"
              onPress={() => router.push('/(app)/yearbook/create')}
            />
          </XStack>
        }
      />
      {yearbooks.length === 0 ? (
        <YStack paddingVertical="$8" alignItems="center" gap="$5">
          <DSText variant="body" color="secondary" textAlign="center" lineHeight={24}>
            You're not in any yearbooks yet. Create one or join with a code.
          </DSText>
          <DSButton
            title="Create yearbook"
            onPress={() => router.push('/(app)/yearbook/create')}
          />
          <DSButton
            title="Join with code"
            variant="outline"
            onPress={() => router.push('/(app)/yearbook/join')}
          />
        </YStack>
      ) : (
        <YStack gap="$4" paddingBottom="$4">
          {yearbooks.map((yb) => (
            <YearbookCard
              key={yb.id}
              yearbook={yb}
              onLeave={yb.role !== 'creator' ? () => handleLeave(yb.id, yb.name) : undefined}
            />
          ))}
        </YStack>
      )}
    </Page>
  );
}
