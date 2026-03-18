import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Pressable,
  Switch,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { getUser } from '@/src/services/firestore';
import { DSIcon } from '@/src/design-system';
import { Container, Text, Button } from '@/src/components/ui';

function SettingsRow({
  label,
  value,
  onPress,
  showChevron = true,
  icon,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  icon?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const content = (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {icon ? <View style={styles.rowIcon}>{icon}</View> : null}
        <Text variant="body" style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {value != null && value !== '' ? (
          <Text variant="body" color="secondary" numberOfLines={1} style={styles.rowValue}>
            {value}
          </Text>
        ) : null}
        {showChevron && onPress ? (
          <DSIcon
            name={{ ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' }}
            size={16}
            color={theme.colors.textMuted}
          />
        ) : null}
      </View>
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.rowWrap, { opacity: pressed ? 0.7 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.rowWrap}>{content}</View>;
}

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <Text
      variant="label"
      color="secondary"
      style={[styles.sectionHeader, { color: theme.colors.textMuted }]}
    >
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { userId, signOut } = useAuth();
  const { colorScheme, setColorScheme, theme } = useTheme();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPhotoURL, setUserPhotoURL] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoadingUser(false);
      return;
    }
    getUser(userId)
      .then((user) => {
        if (user) {
          const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
          setUserName(name || 'No name set');
          setUserEmail(user.email || null);
          setUserPhotoURL(user.photoURL ?? null);
        }
      })
      .finally(() => setLoadingUser(false));
  }, [userId]);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/phone');
        },
      },
    ]);
  };

  const handleHelp = () => {
    Alert.alert(
      'Help',
      'Need support? Email us at support@keepsy.app or visit the help center in a future update.'
    );
  };

  const handlePrivacy = () => {
    Linking.openURL('https://example.com/privacy').catch(() => {
      Alert.alert('Privacy', 'Privacy policy link not configured. Coming soon.');
    });
  };

  const handleTerms = () => {
    Linking.openURL('https://example.com/terms').catch(() => {
      Alert.alert('Terms', 'Terms of service link not configured. Coming soon.');
    });
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Container scroll>
      <Text variant="titleLarge" style={styles.title}>
        Settings
      </Text>

      <SectionHeader title="ACCOUNT" />
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl }]}>
        {loadingUser ? (
          <View style={styles.rowWrap}>
            <ActivityIndicator size="small" />
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => router.push('/(app)/profile/edit')}
              style={({ pressed }) => [styles.rowWrap, styles.editProfileRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              {userPhotoURL ? (
                <Image source={{ uri: userPhotoURL }} style={styles.settingsAvatar} />
              ) : (
                <View style={[styles.settingsAvatarPlaceholder, { backgroundColor: theme.colors.borderMuted }]} />
              )}
              <View style={styles.editProfileContent}>
                <Text variant="body" style={styles.editProfileLabel} numberOfLines={1}>
                  Edit profile
                </Text>
                {userName ? (
                  <Text variant="body" color="secondary" numberOfLines={1} style={styles.editProfileValue}>
                    {userName}
                  </Text>
                ) : null}
              </View>
              <DSIcon
                name={{ ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' }}
                size={16}
                color={theme.colors.textMuted}
              />
            </Pressable>
            {userEmail ? (
              <View style={[styles.rowWrap, styles.rowBorder, { borderTopColor: theme.colors.borderMuted }]}>
                <Text variant="body" color="secondary" style={styles.rowLabel}>
                  Email
                </Text>
                <Text variant="body" color="secondary" numberOfLines={1} style={styles.rowValue}>
                  {userEmail}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      <SectionHeader title="APPEARANCE" />
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl }]}>
        <View style={styles.row}>
          <Text variant="body" style={styles.rowLabel}>
            Dark mode
          </Text>
          <Switch
            value={colorScheme === 'dark'}
            onValueChange={(v) => setColorScheme(v ? 'dark' : 'light')}
            trackColor={{ false: theme.colors.borderMuted, true: theme.colors.primaryMuted }}
            thumbColor={colorScheme === 'dark' ? theme.colors.primary : theme.colors.surface}
          />
        </View>
      </View>

      <SectionHeader title="ABOUT" />
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl }]}>
        <SettingsRow
          label="Help"
          onPress={handleHelp}
          icon={<DSIcon name={{ ios: 'questionmark.circle.fill', android: 'help', web: 'help' }} size={16} color={theme.colors.text} />}
        />
        <SettingsRow
          label="Privacy policy"
          onPress={handlePrivacy}
          icon={<DSIcon name={{ ios: 'lock.shield.fill', android: 'privacy_tip', web: 'verified_user' }} size={16} color={theme.colors.text} />}
        />
        <SettingsRow
          label="Terms of service"
          onPress={handleTerms}
          icon={<DSIcon name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }} size={16} color={theme.colors.text} />}
        />
        <View style={[styles.rowWrap, styles.rowBorder, { borderTopColor: theme.colors.borderMuted }]}>
          <Text variant="body" color="secondary" style={styles.rowLabel}>
            Version
          </Text>
          <Text variant="body" color="muted">
            {appVersion}
          </Text>
        </View>
      </View>

      <View style={styles.signOutWrap}>
        <Button
          title="Sign out"
          variant="outline"
          onPress={handleSignOut}
          icon={<DSIcon name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }} size={16} color={theme.colors.text} />}
          style={styles.signOut}
        />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 28, letterSpacing: -0.3 },
  sectionHeader: {
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
    overflow: 'hidden',
  },
  rowWrap: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderTopWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  rowIcon: { marginRight: 10 },
  rowLabel: { flex: 1, marginRight: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, maxWidth: '60%' },
  rowValue: { textAlign: 'right', marginRight: 2 },
  editProfileRow: { flexDirection: 'row', alignItems: 'center' },
  settingsAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  settingsAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  editProfileContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 8,
    minWidth: 0,
  },
  editProfileLabel: { flex: 1, marginRight: 12 },
  editProfileValue: { textAlign: 'right', maxWidth: '60%' },
  signOutWrap: { marginTop: 16, marginBottom: 32 },
  signOut: {},
});
