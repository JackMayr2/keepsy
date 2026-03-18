import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { useYearbookNav, useScrollToHideNav } from '@/src/contexts/YearbookNavContext';
import { getTravels, createTravel, type Travel } from '@/src/services/firestore';
import { uploadTravelImage } from '@/src/services/storage';
import { getLocationFromImageAsset } from '@/src/utils/imageLocation';
import { logger } from '@/src/utils/logger';
import { DSIcon } from '@/src/design-system';
import { Container, Text, Button, Input } from '@/src/components/ui';
import { standardFlatListScrollProps, TAB_BAR_CONTENT_HEIGHT } from '@/src/design-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/contexts/ThemeContext';

const LIST_PADDING_BASE = 24;
const DEFAULT_LAT = 37.7749;
const DEFAULT_LNG = -122.4194;
const MAP_DELTA = 0.05;

export default function TravelsTab() {
  const id = useYearbookId();
  const navigation = useNavigation();
  const { userId } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { navVisible, setNavVisible } = useYearbookNav();
  const { onScroll, scrollEventThrottle } = useScrollToHideNav();
  const listPaddingBottom = LIST_PADDING_BASE + (navVisible ? TAB_BAR_CONTENT_HEIGHT : 0) + insets.bottom;

  const [travels, setTravels] = useState<Travel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState<Travel | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const [fabOpen, setFabOpen] = useState(false);
  const fabExpand = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fabExpand, {
      toValue: fabOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fabOpen, fabExpand]);

  useEffect(() => {
    setNavVisible(true);
    return () => setNavVisible(true);
  }, [setNavVisible]);
  useEffect(() => {
    navigation.getParent()?.setOptions({ headerShown: navVisible });
  }, [navigation, navVisible]);

  const load = async () => {
    if (!id) return;
    try {
      const list = await getTravels(id);
      setTravels(list);
    } catch (e) {
      logger.error('TravelsTab', 'load failed', e);
      Alert.alert('Error', 'Could not load trips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to add a trip photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      exif: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhotoUri(asset.uri);
      const loc = getLocationFromImageAsset(asset as { exif?: Record<string, unknown> | null });
      if (loc) {
        setLatitude(loc.latitude.toFixed(6));
        setLongitude(loc.longitude.toFixed(6));
      } else {
        setLatitude('');
        setLongitude('');
      }
    }
  };

  const resetAddForm = () => {
    setPhotoUri(null);
    setCaption('');
    setPlaceName('');
    setLatitude('');
    setLongitude('');
    setModalVisible(false);
  };

  const handleAdd = async () => {
    if (!id || !userId) return;
    if (!photoUri) {
      Alert.alert('Photo required', 'Please add a photo for your trip.');
      return;
    }
    setSaving(true);
    try {
      const photoURL = await uploadTravelImage(id, userId, photoUri);
      const lat = latitude.trim() ? parseFloat(latitude) : null;
      const lng = longitude.trim() ? parseFloat(longitude) : null;
      await createTravel(id, userId, {
        photoURL,
        caption: caption.trim() || null,
        placeName: placeName.trim() || null,
        notes: caption.trim() || null,
        latitude: lat ?? null,
        longitude: lng ?? null,
      });
      resetAddForm();
      load();
    } catch (e) {
      logger.error('TravelsTab', 'add failed', e);
      Alert.alert('Error', 'Could not save trip. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const travelsWithLocation = travels.filter((t) => t.latitude != null && t.longitude != null);
  const hasPins = travelsWithLocation.length > 0;
  const initialRegion = hasPins
    ? undefined
    : {
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LNG,
        latitudeDelta: MAP_DELTA,
        longitudeDelta: MAP_DELTA,
      };

  if (loading) {
    return (
      <Container>
        <ActivityIndicator size="large" style={styles.loader} />
      </Container>
    );
  }

  const fabBottom = listPaddingBottom + 24;
  const toggleLabel = activeTab === 'map' ? 'List' : 'Map';
  const toggleIcon = activeTab === 'map' ? 'list.bullet' : 'map';

  return (
    <View style={styles.screen}>
      {/* Full-screen map when in map view (native only) */}
      {activeTab === 'map' && Platform.OS !== 'web' && (
        <View style={StyleSheet.absoluteFill}>
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            region={
              hasPins
                ? undefined
                : {
                    latitude: DEFAULT_LAT,
                    longitude: DEFAULT_LNG,
                    latitudeDelta: 0.5,
                    longitudeDelta: 0.5,
                  }
            }
          >
            {travelsWithLocation.map((t) => (
              <Marker
                key={t.id}
                coordinate={{
                  latitude: t.latitude!,
                  longitude: t.longitude!,
                }}
                title={t.placeName || t.caption || 'Trip'}
                description={t.caption || t.placeName || ''}
                onCalloutPress={() => setSelectedTravel(t)}
              />
            ))}
          </MapView>
        </View>
      )}

      {/* List view: full container with background */}
      {(activeTab === 'list' || (activeTab === 'map' && Platform.OS === 'web')) && (
        <Container style={StyleSheet.absoluteFill}>
          <FlatList
          data={travels}
          keyExtractor={(t) => t.id}
          contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom }]}
          {...standardFlatListScrollProps}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, { borderBottomColor: theme.colors.borderMuted }]}
              onPress={() => setSelectedTravel(item)}
            >
              {item.photoURL ? (
                <Image source={{ uri: item.photoURL }} style={styles.rowImage} />
              ) : (
                <View style={[styles.rowImage, styles.rowImagePlaceholder, { backgroundColor: theme.colors.surfaceSecondary }]} />
              )}
              <View style={styles.rowText}>
                <Text variant="body">{item.placeName || item.caption || 'Trip'}</Text>
                {(item.caption || item.notes) && (
                  <Text variant="caption" color="secondary" numberOfLines={2}>
                    {item.caption || item.notes}
                  </Text>
                )}
              </View>
              <DSIcon name={{ ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' }} size={16} color={theme.colors.textMuted} />
            </Pressable>
          )}
        />
        </Container>
      )}

      {/* Web map placeholder overlay when map tab on web */}
      {activeTab === 'map' && Platform.OS === 'web' && (
        <View style={[StyleSheet.absoluteFill, styles.webMapOverlay]} pointerEvents="none">
          <View style={[styles.mapPlaceholder, { backgroundColor: theme.colors.surfaceGlass }]}>
            <Text variant="body" color="secondary">
              Map view is available in the app. Use the menu to switch to List.
            </Text>
          </View>
        </View>
      )}

      {/* Floating action button with expandable menu */}
      <View style={[styles.fabContainer, { bottom: fabBottom }]} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.fabMenu,
            {
              opacity: fabExpand,
              transform: [
                {
                  translateY: fabExpand.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={fabOpen ? 'auto' : 'none'}
        >
          <Pressable
            style={[styles.fabMenuItem, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              setModalVisible(true);
              setFabOpen(false);
            }}
          >
            <DSIcon name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} size={22} color={theme.colors.primary} />
            <Text variant="body" style={[styles.fabMenuLabel, { color: theme.colors.text }]}>
              Add trip
            </Text>
          </Pressable>
          <Pressable
            style={[styles.fabMenuItem, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              setActiveTab(activeTab === 'map' ? 'list' : 'map');
              setFabOpen(false);
            }}
          >
            <DSIcon name={{ ios: toggleIcon, android: activeTab === 'map' ? 'list' : 'map', web: activeTab === 'map' ? 'list' : 'map' }} size={22} color={theme.colors.primary} />
            <Text variant="body" style={[styles.fabMenuLabel, { color: theme.colors.text }]}>
              {toggleLabel} view
            </Text>
          </Pressable>
        </Animated.View>
        <Pressable
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => setFabOpen((o) => !o)}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: fabExpand.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg'],
                  }),
                },
              ],
            }}
          >
            <DSIcon name={{ ios: 'plus', android: 'add', web: 'add' }} size={28} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
      </View>

      {/* Add trip modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <Pressable
              style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text variant="title" style={styles.modalTitle}>
                  Add trip
                </Text>
                <Text variant="caption" color="secondary" style={styles.modalHint}>
                  Add a photo and caption. Location is read from the photo when available, or enter it below.
                </Text>
                {photoUri ? (
                  <View style={styles.photoRow}>
                    <Image source={{ uri: photoUri }} style={styles.previewImage} />
                    <Button
                      title="Change photo"
                      variant="ghost"
                      onPress={pickPhoto}
                      icon={<DSIcon name={{ ios: 'photo.on.rectangle.angled', android: 'photo_library', web: 'photo_library' }} size={16} color={theme.colors.text} />}
                    />
                  </View>
                ) : (
                  <Button
                    title="Choose photo"
                    onPress={pickPhoto}
                    icon={<DSIcon name={{ ios: 'photo.fill.on.rectangle.fill', android: 'add_a_photo', web: 'add_a_photo' }} size={16} color="#FFFFFF" />}
                    style={styles.choosePhotoBtn}
                  />
                )}
                <Input
                  label="Caption"
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Describe this trip (visible to yearbook members)"
                  multiline
                  style={styles.input}
                />
                <Input
                  label="Place name (optional)"
                  value={placeName}
                  onChangeText={setPlaceName}
                  placeholder="e.g. Paris, France"
                  style={styles.input}
                />
                <Text variant="label" color="secondary" style={styles.sectionLabel}>
                  Location for map pin (optional)
                </Text>
                <Text variant="caption" color="secondary" style={styles.sectionHint}>
                  If the photo has no location data, enter coordinates below.
                </Text>
                <View style={styles.coordRow}>
                  <Input
                    label="Latitude"
                    value={latitude}
                    onChangeText={setLatitude}
                    placeholder="e.g. 48.8566"
                    keyboardType="numbers-and-punctuation"
                    style={styles.coordInput}
                  />
                  <Input
                    label="Longitude"
                    value={longitude}
                    onChangeText={setLongitude}
                    placeholder="e.g. 2.3522"
                    keyboardType="numbers-and-punctuation"
                    style={styles.coordInput}
                  />
                </View>
                <View style={styles.modalActions}>
                  <Button title="Cancel" variant="ghost" onPress={() => setModalVisible(false)} />
                  <Button
                    title="Save trip"
                    onPress={handleAdd}
                    loading={saving}
                    disabled={!photoUri}
                    icon={<DSIcon name={{ ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }} size={16} color="#FFFFFF" />}
                  />
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Pin / trip detail modal */}
      <Modal visible={!!selectedTravel} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedTravel(null)}>
          <Pressable
            style={[styles.detailContent, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedTravel && (
              <>
                {selectedTravel.photoURL ? (
                  <Image source={{ uri: selectedTravel.photoURL }} style={styles.detailImage} resizeMode="cover" />
                ) : null}
                <View style={styles.detailBody}>
                  {selectedTravel.placeName ? (
                    <Text variant="title" style={styles.detailTitle}>
                      {selectedTravel.placeName}
                    </Text>
                  ) : null}
                  {(selectedTravel.caption || selectedTravel.notes) ? (
                    <Text variant="body" color="secondary" style={styles.detailCaption}>
                      {selectedTravel.caption || selectedTravel.notes}
                    </Text>
                  ) : null}
                </View>
                <Button title="Close" variant="ghost" onPress={() => setSelectedTravel(null)} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
  },
  loader: { marginTop: 24 },
  webMapOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mapPlaceholder: {
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    maxWidth: 320,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'flex-end',
  },
  fabMenu: {
    marginBottom: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  fabMenuLabel: {
    fontWeight: '600',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  rowImagePlaceholder: {},
  rowText: { flex: 1, minWidth: 0 },
  modalRoot: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: { marginBottom: 8 },
  modalHint: { marginBottom: 16 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  previewImage: { width: 100, height: 75, borderRadius: 12 },
  choosePhotoBtn: { marginBottom: 16 },
  input: { marginBottom: 12 },
  sectionLabel: { marginTop: 8, marginBottom: 4 },
  sectionHint: { marginBottom: 8 },
  coordRow: { flexDirection: 'row', gap: 12 },
  coordInput: { flex: 1 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  detailContent: {
    marginHorizontal: 24,
    marginVertical: 80,
    borderRadius: 24,
    overflow: 'hidden',
  },
  detailImage: {
    width: '100%',
    height: 240,
  },
  detailBody: { padding: 24 },
  detailTitle: { marginBottom: 8 },
  detailCaption: {},
});
