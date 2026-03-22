import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUser, updateUser } from '@/src/services/firestore';
import { uploadProfileImage } from '@/src/services/storage';
import { logger } from '@/src/utils/logger';
import { DSIcon } from '@/src/design-system';
import { Container, Button, Input, Text, PlaceAutocomplete, type ResolvedPlace } from '@/src/components/ui';
import { useTheme } from '@/src/contexts/ThemeContext';

const SOCIAL_KEYS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'username or profile URL' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'username or profile URL' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'profile URL' },
] as const;

export default function EditProfileScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [cityText, setCityText] = useState('');
  const [homePlace, setHomePlace] = useState<ResolvedPlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getUser(userId)
      .then((user) => {
        if (user) {
          setFirstName(user.firstName ?? '');
          setLastName(user.lastName ?? '');
          setEmail(user.email ?? '');
          setBio(user.bio ?? '');
          setPhotoURL(user.photoURL ?? null);
          setSocialLinks(user.socialLinks ?? {});
          const c = user.city?.trim() ?? '';
          setCityText(c);
          if (
            c &&
            user.homeLatitude != null &&
            user.homeLongitude != null &&
            Number.isFinite(user.homeLatitude) &&
            Number.isFinite(user.homeLongitude)
          ) {
            setHomePlace({
              label: c,
              latitude: user.homeLatitude,
              longitude: user.homeLongitude,
            });
          } else {
            setHomePlace(null);
          }
        }
      })
      .catch((e) => {
        logger.error('EditProfile', 'getUser failed', e);
        Alert.alert('Error', 'Could not load profile.');
      })
      .finally(() => setLoadingProfile(false));
  }, [userId]);

  const pickProfileImage = async () => {
    if (!userId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadProfileImage(userId, result.assets[0].uri);
      await updateUser(userId, { photoURL: url });
      setPhotoURL(url);
    } catch (e) {
      logger.error('EditProfile', 'uploadProfileImage failed', e);
      Alert.alert('Error', 'Could not upload photo. Try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert('Missing fields', 'Please fill in first name, last name, and email.');
      return;
    }
    setLoading(true);
    try {
      const links: Record<string, string> = {};
      SOCIAL_KEYS.forEach(({ key }) => {
        const v = socialLinks[key]?.trim();
        if (v) links[key] = v;
      });
      await updateUser(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        bio: bio.trim() || undefined,
        socialLinks: Object.keys(links).length ? links : undefined,
        city: cityText.trim() ? cityText.trim() : null,
        homeLatitude: homePlace ? homePlace.latitude : null,
        homeLongitude: homePlace ? homePlace.longitude : null,
      });
      setLoading(false);
      router.back();
    } catch (e) {
      setLoading(false);
      logger.error('EditProfile', 'updateUser failed', e);
      Alert.alert('Error', 'Could not save profile. Try again.');
    }
  };

  if (loadingProfile) {
    return (
      <Container>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </Container>
    );
  }

  return (
    <Container scroll>
      <View style={styles.avatarSection}>
        <Pressable
          onPress={pickProfileImage}
          disabled={uploadingPhoto}
          style={({ pressed }) => [
            styles.avatarTouch,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.borderMuted }]}>
              <Text variant="body" color="secondary">
                {uploadingPhoto ? '…' : 'Add photo'}
              </Text>
            </View>
          )}
          {uploadingPhoto && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </Pressable>
        <Text variant="caption" color="secondary" style={styles.avatarHint}>
          Tap to change profile picture
        </Text>
      </View>

      <Text variant="body" color="secondary" style={styles.hint}>
        Update your name and contact info. This is visible to others in your yearbooks.
      </Text>
      <Input
        label="First name"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="First name"
        autoCapitalize="words"
        containerStyle={styles.input}
      />
      <Input
        label="Last name"
        value={lastName}
        onChangeText={setLastName}
        placeholder="Last name"
        autoCapitalize="words"
        containerStyle={styles.input}
      />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        containerStyle={styles.input}
      />
      <Input
        label="Bio (optional)"
        value={bio}
        onChangeText={setBio}
        placeholder="A few words about you"
        multiline
        containerStyle={styles.input}
      />

      <PlaceAutocomplete
        label="Home city (optional)"
        placeholder="Search for your city"
        value={cityText}
        onChangeText={setCityText}
        onResolvedPlaceChange={setHomePlace}
        syncedResolvedPlace={homePlace}
        containerStyle={styles.input}
      />
      <Text variant="caption" color="secondary" style={styles.cityHint}>
        Pick a suggestion to save your location on yearbook maps. Typing alone saves the name only.
      </Text>

      <Text variant="label" color="secondary" style={styles.socialSectionTitle}>
        Social links (optional)
      </Text>
      {SOCIAL_KEYS.map(({ key, label, placeholder }) => (
        <Input
          key={key}
          label={label}
          value={socialLinks[key] ?? ''}
          onChangeText={(text) => setSocialLinks((prev) => ({ ...prev, [key]: text }))}
          placeholder={placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.input}
        />
      ))}

      <Button
        title="Save changes"
        onPress={handleSave}
        loading={loading}
        icon={<DSIcon name={{ ios: 'checkmark.circle.fill', android: 'task_alt', web: 'check_circle' }} size={16} color="#FFFFFF" />}
        style={styles.button}
      />
    </Container>
  );
}

const AVATAR_SIZE = 100;

const styles = StyleSheet.create({
  hint: { marginBottom: 24 },
  input: { marginBottom: 16 },
  button: { marginTop: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
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
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: { marginTop: 8 },
  socialSectionTitle: { marginBottom: 8, marginTop: 8 },
  cityHint: { marginTop: -8, marginBottom: 16 },
});
