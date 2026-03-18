import React, { useCallback, useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack } from 'tamagui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useYearbooks } from '@/src/hooks/useYearbooks';
import { leaveYearbook } from '@/src/services/firestore';
import { Page, DSButton, DSIcon, DSText, EmptyState, FloatingKeepsyIcon, SkeletonBlock } from '@/src/design-system';
import { YearbookCard } from '@/src/components/YearbookCard';

export default function HomeScreen() {
  const { userId, pendingJoinCode } = useAuth();
  const { theme } = useTheme();
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
      <Page flex={1}>
        <YStack paddingTop="$4" gap="$4">
          <SkeletonBlock lines={4} padding="$5" borderRadius={20} backgroundColor="$backgroundStrong" />
          <SkeletonBlock lines={4} padding="$5" borderRadius={20} backgroundColor="$backgroundStrong" />
        </YStack>
      </Page>
    );
  }

  if (error) {
    return (
      <Page flex={1} justifyContent="center" alignItems="center" paddingHorizontal="$6">
        <DSText variant="title" textAlign="center" marginBottom="$2">
          Something went wrong
        </DSText>
        <DSText variant="body" color="secondary" textAlign="center" marginBottom="$5">
          {error.message}
        </DSText>
        <DSButton
          title="Try again"
          onPress={refresh}
          variant="outline"
          icon={<DSIcon name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={16} color={theme.colors.text} />}
        />
      </Page>
    );
  }

  return (
    <View style={homeStyles.screen}>
      <Page scroll floatingTabBarHeight={0}>
        <YStack marginBottom="$6">
          <XStack alignItems="center" justifyContent="flex-end" flexWrap="wrap" gap="$3" width="100%">
            <DSButton
              title="Join"
              compact
              variant="outline"
              icon={<DSIcon name={{ ios: 'person.badge.plus', android: 'group_add', web: 'person_add' }} size={16} color={theme.colors.text} />}
              onPress={() => router.push('/(app)/yearbook/join')}
            />
            <DSButton
              title="Create"
              compact
              icon={<DSIcon name={{ ios: 'plus', android: 'add', web: 'add' }} size={16} color="#FFFFFF" />}
              onPress={() => router.push('/(app)/yearbook/create')}
            />
          </XStack>
        </YStack>
        {yearbooks.length === 0 ? (
          <EmptyState
            title="No yearbooks yet"
            description="Create a yearbook or join one with a code from a friend."
            actionLabel="Create yearbook"
            onAction={() => router.push('/(app)/yearbook/create')}
            secondaryActionLabel="Join with code"
            onSecondaryAction={() => router.push('/(app)/yearbook/join')}
          />
        ) : (
          <YStack gap="$4" paddingBottom="$6">
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
      <View style={homeStyles.floatingWrap} pointerEvents="box-none">
        <FloatingKeepsyIcon />
      </View>
    </View>
  );
}

const homeStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  floatingWrap: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
});
