import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ActivityIndicator,
  Linking,
  Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getUser } from '@/src/services/firestore';
import { Container, Text, SocialPlatformIcon } from '@/src/components/ui';
import type { User } from '@/src/types/user.types';
import { useTheme } from '@/src/contexts/ThemeContext';
import { resolveSocialUrl, socialLinkDisplayText } from '@/src/utils/socialLinks';

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  twitter: 'Twitter / X',
  linkedin: 'LinkedIn',
};

export default function MemberProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getUser(userId)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <Container>
        <ActivityIndicator size="large" style={styles.loader} />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container>
        <Text variant="body" color="secondary">
          Profile not found.
        </Text>
      </Container>
    );
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name';
  const socialLinks = user.socialLinks ?? {};

  return (
    <Container scroll>
      <View style={styles.header}>
        {user.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.borderMuted }]}>
            <Text variant="title" color="secondary">
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text variant="titleLarge" style={styles.name}>
          {name}
        </Text>
        {user.bio ? (
          <Text variant="body" color="secondary" style={styles.bio}>
            {user.bio}
          </Text>
        ) : null}
        {user.city ? (
          <Text variant="body" color="secondary" style={styles.city}>
            {user.city}
          </Text>
        ) : null}
      </View>
      {Object.keys(socialLinks).length > 0 ? (
        <View style={styles.section}>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>
            Connect
          </Text>
          <View style={styles.socialRow}>
            {Object.entries(socialLinks).map(([key, value]) => {
              if (!value?.trim()) return null;
              const url = resolveSocialUrl(key, value);
              const display = socialLinkDisplayText(key, value);
              const a11y = `${SOCIAL_LABELS[key] ?? key}, ${display}`;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="link"
                  accessibilityLabel={a11y}
                  onPress={() => url && Linking.openURL(url)}
                  style={({ pressed }) => [
                    styles.socialChip,
                    {
                      backgroundColor: theme.colors.surfaceGlass,
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.socialIconCircle,
                      { backgroundColor: theme.colors.borderMuted },
                    ]}
                  >
                    <SocialPlatformIcon platform={key} size={24} />
                  </View>
                  <Text variant="caption" color="secondary" numberOfLines={1} style={styles.socialChipLabel}>
                    {display}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { marginBottom: 8 },
  bio: { textAlign: 'center', paddingHorizontal: 24 },
  city: { textAlign: 'center', marginTop: 8, paddingHorizontal: 24 },
  section: { marginTop: 16 },
  sectionTitle: { marginBottom: 8 },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  socialChip: {
    alignItems: 'center',
    width: 88,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  socialIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  socialChipLabel: {
    textAlign: 'center',
    maxWidth: '100%',
  },
});
