import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  Image,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MapView from 'react-native-maps';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { useYearbookNav, useScrollToHideNav } from '@/src/contexts/YearbookNavContext';
import { getTravels, createTravel, getYearbookMembers, getUser, type Travel } from '@/src/services/firestore';
import { uploadTravelImage } from '@/src/services/storage';
import { getLocationFromImageAsset } from '@/src/utils/imageLocation';
import { logger } from '@/src/utils/logger';
import { DSIcon, KeepsyBookLoader } from '@/src/design-system';
import { Container, Text, Button, Input, PlaceAutocomplete, type ResolvedPlace } from '@/src/components/ui';
import { AppKeyboardAwareScrollView } from '@/src/components/ui/AppKeyboardAwareScrollView';
import { MapProfileMarker, initialsFromName } from '@/src/components/maps/MapProfileMarker';
import { standardFlatListScrollProps, TAB_BAR_CONTENT_HEIGHT } from '@/src/design-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/contexts/ThemeContext';

const LIST_PADDING_BASE = 24;
const DEFAULT_LAT = 37.7749;
const DEFAULT_LNG = -122.4194;
const MAP_DELTA = 0.05;

type MapPinDetail =
  | { kind: 'travel'; travel: Travel }
  | { kind: 'home'; userId: string; name: string; label: string; photoURL?: string | null };

type TravelAuthorInfo = { photoURL?: string | null; initials: string };

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
  const [mapDetail, setMapDetail] = useState<MapPinDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const [fabOpen, setFabOpen] = useState(false);
  const fabExpand = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<React.ElementRef<typeof MapView>>(null);
  const [memberHomes, setMemberHomes] = useState<
    {
      userId: string;
      name: string;
      label: string;
      latitude: number;
      longitude: number;
      photoURL?: string | null;
    }[]
  >([]);
  const [travelAuthors, setTravelAuthors] = useState<Record<string, TravelAuthorInfo>>({});

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
      const uids = [...new Set(list.map((t) => t.userId))];
      const profiles = await Promise.all(uids.map((uid) => getUser(uid)));
      const byId: Record<string, TravelAuthorInfo> = {};
      uids.forEach((uid, i) => {
        const u = profiles[i];
        const name = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '';
        byId[uid] = {
          photoURL: u?.photoURL ?? null,
          initials: initialsFromName(name || 'Member'),
        };
      });
      setTravelAuthors(byId);
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

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const members = await getYearbookMembers(id);
        const profiles = await Promise.all(members.map((m) => getUser(m.userId)));
        const homes: {
          userId: string;
          name: string;
          label: string;
          latitude: number;
          longitude: number;
        }[] = [];
        profiles.forEach((u, i) => {
          if (!u) return;
          const lat = u.homeLatitude;
          const lng = u.homeLongitude;
          if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Member';
          homes.push({
            userId: members[i].userId,
            name,
            label: u.city?.trim() || `${name}'s home`,
            latitude: lat,
            longitude: lng,
            photoURL: u.photoURL ?? null,
          });
        });
        if (!cancelled) setMemberHomes(homes);
      } catch (e) {
        logger.error('TravelsTab', 'load member homes failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
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
      const norm = (s: string) => s.trim().replace(/,/g, '.');
      const latRaw = latitude.trim() ? parseFloat(norm(latitude)) : NaN;
      const lngRaw = longitude.trim() ? parseFloat(norm(longitude)) : NaN;
      const latOk = Number.isFinite(latRaw) && latRaw >= -90 && latRaw <= 90;
      const lngOk = Number.isFinite(lngRaw) && lngRaw >= -180 && lngRaw <= 180;
      await createTravel(id, userId, {
        photoURL,
        caption: caption.trim() || null,
        placeName: placeName.trim() || null,
        notes: caption.trim() || null,
        latitude: latOk ? latRaw : null,
        longitude: lngOk ? lngRaw : null,
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

  const travelsWithLocation = travels.filter(
    (t) =>
      t.latitude != null &&
      t.longitude != null &&
      Number.isFinite(t.latitude) &&
      Number.isFinite(t.longitude)
  );
  const hasPins = travelsWithLocation.length + memberHomes.length > 0;

  const mapInitialRegion = {
    latitude: travelsWithLocation[0]?.latitude ?? memberHomes[0]?.latitude ?? DEFAULT_LAT,
    longitude: travelsWithLocation[0]?.longitude ?? memberHomes[0]?.longitude ?? DEFAULT_LNG,
    latitudeDelta: MAP_DELTA,
    longitudeDelta: MAP_DELTA,
  };

  useEffect(() => {
    if (Platform.OS === 'web' || activeTab !== 'map') return;
    const tripCoords = travels
      .filter(
        (t) =>
          t.latitude != null &&
          t.longitude != null &&
          Number.isFinite(t.latitude) &&
          Number.isFinite(t.longitude)
      )
      .map((t) => ({ latitude: t.latitude!, longitude: t.longitude! }));
    const coords = [
      ...tripCoords,
      ...memberHomes.map((h) => ({ latitude: h.latitude, longitude: h.longitude })),
    ];
    if (coords.length === 0) return;
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 100, right: 48, bottom: 220, left: 48 },
        animated: true,
      });
    }, 450);
    return () => clearTimeout(t);
  }, [activeTab, travels, memberHomes]);

  if (loading) {
    return (
      <Container>
        <View style={styles.loaderWrap}>
          <KeepsyBookLoader size={52} />
        </View>
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
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={
              hasPins
                ? mapInitialRegion
                : {
                    latitude: DEFAULT_LAT,
                    longitude: DEFAULT_LNG,
                    latitudeDelta: 0.5,
                    longitudeDelta: 0.5,
                  }
            }
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {travelsWithLocation.map((t) => {
              const author = travelAuthors[t.userId] ?? { initials: '?' };
              return (
                <MapProfileMarker
                  key={t.id}
                  coordinate={{
                    latitude: t.latitude!,
                    longitude: t.longitude!,
                  }}
                  photoURL={author.photoURL}
                  initials={author.initials}
                  title={t.placeName || t.caption || 'Trip'}
                  description={t.caption || t.placeName || ''}
                  variant="trip"
                  onPress={() => setMapDetail({ kind: 'travel', travel: t })}
                />
              );
            })}
            {memberHomes.map((h) => (
              <MapProfileMarker
                key={`home-${h.userId}`}
                coordinate={{ latitude: h.latitude, longitude: h.longitude }}
                photoURL={h.photoURL}
                initials={initialsFromName(h.name)}
                title={`${h.name} — home`}
                description={h.label}
                variant="home"
                onPress={() =>
                  setMapDetail({
                    kind: 'home',
                    userId: h.userId,
                    name: h.name,
                    label: h.label,
                    photoURL: h.photoURL,
                  })
                }
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
              onPress={() => setMapDetail({ kind: 'travel', travel: item })}
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
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <Pressable
              style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
              onPress={(e) => e.stopPropagation()}
            >
              <AppKeyboardAwareScrollView
                showsVerticalScrollIndicator={false}
                extraScrollHeight={140}
                extraHeight={32}
                contentContainerStyle={styles.modalScrollContent}
              >
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
                <PlaceAutocomplete
                  label="Place for map pin (optional)"
                  placeholder="Search for a city or place"
                  value={placeName}
                  onChangeText={setPlaceName}
                  invalidateResolvedWhenTextChanges={false}
                  onResolvedPlaceChange={(p: ResolvedPlace | null) => {
                    if (p) {
                      setLatitude(p.latitude.toFixed(6));
                      setLongitude(p.longitude.toFixed(6));
                    }
                  }}
                  containerStyle={styles.input}
                />
                <Text variant="caption" color="secondary" style={styles.sectionHint}>
                  Pick a suggestion to place the pin accurately. Photo GPS fills coordinates when available.
                </Text>
                <Text variant="label" color="secondary" style={styles.sectionLabel}>
                  Or enter coordinates manually
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
              </AppKeyboardAwareScrollView>
            </Pressable>
          </Pressable>
        </View>
      </Modal>

      {/* Map pin detail (trip or member home) */}
      <Modal visible={!!mapDetail} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setMapDetail(null)}>
          <Pressable
            style={[styles.detailContent, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {mapDetail?.kind === 'travel' ? (
              <>
                {mapDetail.travel.photoURL ? (
                  <Image source={{ uri: mapDetail.travel.photoURL }} style={styles.detailImage} resizeMode="cover" />
                ) : null}
                <View style={styles.detailBody}>
                  {(() => {
                    const a = travelAuthors[mapDetail.travel.userId];
                    if (!a) return null;
                    return (
                      <View style={styles.detailAuthorRow}>
                        {a.photoURL ? (
                          <Image source={{ uri: a.photoURL }} style={styles.detailAuthorAvatar} />
                        ) : (
                          <View style={[styles.detailAuthorAvatar, styles.detailAuthorFallback]}>
                            <Text variant="caption" style={styles.detailAuthorInitials}>
                              {a.initials}
                            </Text>
                          </View>
                        )}
                        <Text variant="caption" color="secondary">
                          Posted by a yearbook member
                        </Text>
                      </View>
                    );
                  })()}
                  {mapDetail.travel.placeName ? (
                    <Text variant="title" style={styles.detailTitle}>
                      {mapDetail.travel.placeName}
                    </Text>
                  ) : null}
                  {mapDetail.travel.caption || mapDetail.travel.notes ? (
                    <Text variant="body" color="secondary" style={styles.detailCaption}>
                      {mapDetail.travel.caption || mapDetail.travel.notes}
                    </Text>
                  ) : null}
                </View>
                <Button title="Close" variant="ghost" onPress={() => setMapDetail(null)} />
              </>
            ) : null}
            {mapDetail?.kind === 'home' ? (
              <View style={styles.detailBody}>
                <View style={styles.homeHeaderRow}>
                  {mapDetail.photoURL ? (
                    <Image source={{ uri: mapDetail.photoURL }} style={styles.detailHomeAvatar} />
                  ) : (
                    <View style={[styles.detailHomeAvatar, styles.detailAuthorFallback]}>
                      <Text variant="title" style={styles.detailAuthorInitials}>
                        {initialsFromName(mapDetail.name)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.homeHeaderText}>
                    <Text variant="title" style={styles.detailTitle}>
                      {mapDetail.name}
                    </Text>
                    <Text variant="label" color="secondary" style={styles.homeBadge}>
                      Home location
                    </Text>
                  </View>
                </View>
                <Text variant="body" color="secondary" style={styles.detailCaption}>
                  {mapDetail.label}
                </Text>
                <Button title="Close" variant="ghost" onPress={() => setMapDetail(null)} style={styles.homeCloseBtn} />
              </View>
            ) : null}
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
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
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
  modalScrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
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
  detailAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  detailAuthorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  detailAuthorFallback: {
    backgroundColor: '#7C6BB5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAuthorInitials: { color: '#fff', fontWeight: '700' },
  homeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  detailHomeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  homeHeaderText: { flex: 1 },
  homeBadge: { marginBottom: 0, marginTop: 4 },
  homeCloseBtn: { marginTop: 16 },
});
