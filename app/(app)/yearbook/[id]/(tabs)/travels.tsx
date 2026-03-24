import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ScrollView,
  Dimensions,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import MapView from 'react-native-maps';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useYearbookId } from '@/src/contexts/YearbookIdContext';
import { useYearbookNav, useScrollToHideNav } from '@/src/contexts/YearbookNavContext';
import {
  getTravels,
  createTravel,
  getYearbookMembers,
  getUser,
  travelPhotoUrls,
  type Travel,
} from '@/src/services/firestore';
import { uploadTravelImage } from '@/src/services/storage';
import { getLocationFromImageAsset } from '@/src/utils/imageLocation';
import { jitteredCoordinatesForPins } from '@/src/utils/mapPinLayout';
import { asyncPool } from '@/src/utils/asyncPool';
import { prepareTripPhotoForUpload } from '@/src/utils/prepareTripPhotoForUpload';
import { saveImageToLibraryFromUri } from '@/src/utils/saveImageToLibrary';
import { logger } from '@/src/utils/logger';
import { FullscreenZoomablePhoto } from '@/src/components/media/FullscreenZoomablePhoto';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DSIcon, DeferredFullscreenLoader, KeepsyBookLoader } from '@/src/design-system';
import { Container, Text, Button, Input, PlaceAutocomplete, type ResolvedPlace } from '@/src/components/ui';
import { MapProfileMarker, initialsFromName } from '@/src/components/maps/MapProfileMarker';
import { standardFlatListScrollProps, TAB_BAR_CONTENT_HEIGHT } from '@/src/design-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/contexts/ThemeContext';

const LIST_PADDING_BASE = 24;
const DEFAULT_LAT = 37.7749;
const DEFAULT_LNG = -122.4194;
const MAP_DELTA = 0.05;
const ROW_THUMB_SIZE = 56;
/** Modal sheet horizontal padding (each side) — matches `modalContent.padding` */
const MODAL_SHEET_PADDING_H = 24;

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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { navVisible, setNavVisible } = useYearbookNav();
  const { onScroll, scrollEventThrottle } = useScrollToHideNav();
  const listPaddingBottom = LIST_PADDING_BASE + (navVisible ? TAB_BAR_CONTENT_HEIGHT : 0) + insets.bottom;

  const [travels, setTravels] = useState<Travel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
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
  /** Which trip photo is shown in the map/list detail pager */
  const [travelDetailPhotoIndex, setTravelDetailPhotoIndex] = useState(0);
  /** Preview pager index in “Add trip” when multiple photos selected */
  const [addTripPreviewIndex, setAddTripPreviewIndex] = useState(0);

  const addTripPagerWidth = Math.max(260, Dimensions.get('window').width - MODAL_SHEET_PADDING_H * 2);
  const tripDetailPagerWidth = Math.max(280, Dimensions.get('window').width - 48);

  useEffect(() => {
    setTravelDetailPhotoIndex(0);
  }, [mapDetail]);

  useEffect(() => {
    setAddTripPreviewIndex((i) => Math.min(i, Math.max(0, photoUris.length - 1)));
  }, [photoUris]);

  const [fullscreenGallery, setFullscreenGallery] = useState<{
    urls: string[];
    initialIndex: number;
  } | null>(null);
  const [fullscreenPhotoIndex, setFullscreenPhotoIndex] = useState(0);
  const [saveProgress, setSaveProgress] = useState<{
    phase: 'prepare' | 'upload';
    done: number;
    total: number;
  } | null>(null);
  /** While true, fullscreen PagerView horizontal scroll is disabled so pan/zoom wins. */
  const [fullscreenImageZoomed, setFullscreenImageZoomed] = useState(false);
  const [savingFullscreenPhoto, setSavingFullscreenPhoto] = useState(false);

  const fullscreenScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (fullscreenGallery) {
      setFullscreenPhotoIndex(fullscreenGallery.initialIndex);
      setFullscreenImageZoomed(false);
      if (Platform.OS === 'web') {
        const idx = fullscreenGallery.initialIndex;
        requestAnimationFrame(() => {
          fullscreenScrollRef.current?.scrollTo({ x: idx * windowWidth, animated: false });
        });
      }
    }
  }, [fullscreenGallery, windowWidth]);

  /** Warm cache for prev/current/next so paging in fullscreen feels instant (native). */
  useEffect(() => {
    if (!fullscreenGallery || Platform.OS === 'web') return;
    const { urls } = fullscreenGallery;
    const i = fullscreenPhotoIndex;
    for (const idx of [i - 1, i, i + 1]) {
      if (idx >= 0 && idx < urls.length && urls[idx]) {
        Image.prefetch(urls[idx]).catch(() => {});
      }
    }
  }, [fullscreenGallery, fullscreenPhotoIndex]);

  const saveCurrentFullscreenPhoto = async () => {
    if (!fullscreenGallery) return;
    const uri = fullscreenGallery.urls[fullscreenPhotoIndex];
    if (!uri) return;
    setSavingFullscreenPhoto(true);
    try {
      await saveImageToLibraryFromUri(uri);
      Alert.alert(
        'Saved',
        Platform.OS === 'web' ? 'Your browser should download the photo.' : 'Photo saved to your library.'
      );
    } catch (e) {
      logger.error('TravelsTab', 'save photo failed', e);
      Alert.alert('Could not save', 'Check permissions or your connection and try again.');
    } finally {
      setSavingFullscreenPhoto(false);
    }
  };

  const openFullscreen = (urls: string[], initialIndex: number) => {
    if (urls.length === 0) return;
    // Close trip detail first — a second Modal on top is unreliable on Android/iOS (black screen / no focus).
    setMapDetail(null);
    setFullscreenGallery({ urls, initialIndex: Math.max(0, Math.min(urls.length - 1, initialIndex)) });
  };

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
        photoURL?: string | null;
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

  const removeTripPhotoAt = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  };

  const pickTripPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to add trip photos.');
      return;
    }
    const multi = Platform.OS !== 'web';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: multi,
      selectionLimit: multi ? 24 : 1,
      // Cropping strips GPS; multi-select is incompatible with editing.
      allowsEditing: false,
      quality: 0.85,
      exif: Platform.OS !== 'web',
    });
    if (result.canceled || !result.assets?.length) return;

    setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);

    const needLat = !latitude.trim();
    const needLng = !longitude.trim();
    if (needLat || needLng) {
      for (const asset of result.assets) {
        const loc = getLocationFromImageAsset(asset as { exif?: Record<string, unknown> | null });
        if (loc) {
          if (needLat) setLatitude(loc.latitude.toFixed(6));
          if (needLng) setLongitude(loc.longitude.toFixed(6));
          break;
        }
      }
    }
  };

  const resetAddForm = () => {
    setPhotoUris([]);
    setCaption('');
    setPlaceName('');
    setLatitude('');
    setLongitude('');
    setModalVisible(false);
  };

  const handleAdd = async () => {
    if (!id || !userId) return;
    if (photoUris.length === 0) {
      Alert.alert('Photos required', 'Please add at least one photo for your trip.');
      return;
    }
    setSaving(true);
    setSaveProgress({ phase: 'prepare', done: 0, total: photoUris.length });
    try {
      let prepareDone = 0;
      const prepared = await asyncPool(3, photoUris, async (uri) => {
        const p = await prepareTripPhotoForUpload(uri);
        prepareDone += 1;
        setSaveProgress({ phase: 'prepare', done: prepareDone, total: photoUris.length });
        return p;
      });

      setSaveProgress({ phase: 'upload', done: 0, total: prepared.length });
      let uploadDone = 0;
      const photoURLs = await asyncPool(4, prepared, async (uri) => {
        const url = await uploadTravelImage(id, userId, uri);
        uploadDone += 1;
        setSaveProgress({ phase: 'upload', done: uploadDone, total: prepared.length });
        return url;
      });
      const norm = (s: string) => s.trim().replace(/,/g, '.');
      const latRaw = latitude.trim() ? parseFloat(norm(latitude)) : NaN;
      const lngRaw = longitude.trim() ? parseFloat(norm(longitude)) : NaN;
      const latOk = Number.isFinite(latRaw) && latRaw >= -90 && latRaw <= 90;
      const lngOk = Number.isFinite(lngRaw) && lngRaw >= -180 && lngRaw <= 180;
      await createTravel(id, userId, {
        photoURLs,
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
      setSaveProgress(null);
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

  const jitterCoordsByKey = useMemo(() => {
    const pins = [
      ...travelsWithLocation.map((t) => ({
        key: `travel-${t.id}`,
        latitude: t.latitude!,
        longitude: t.longitude!,
      })),
      ...memberHomes.map((h) => ({
        key: `home-${h.userId}`,
        latitude: h.latitude,
        longitude: h.longitude,
      })),
    ];
    return jitteredCoordinatesForPins(pins);
  }, [travels, memberHomes]);

  const mapInitialRegion = {
    latitude: travelsWithLocation[0]?.latitude ?? memberHomes[0]?.latitude ?? DEFAULT_LAT,
    longitude: travelsWithLocation[0]?.longitude ?? memberHomes[0]?.longitude ?? DEFAULT_LNG,
    latitudeDelta: MAP_DELTA,
    longitudeDelta: MAP_DELTA,
  };

  const rowPhotoIndexRef = useRef<Record<string, number>>({});

  const saveProgressSubtitle = useMemo(() => {
    if (!saveProgress) return undefined;
    if (saveProgress.phase === 'prepare') {
      return `Optimizing photos ${saveProgress.done}/${saveProgress.total}…`;
    }
    return `Uploading ${saveProgress.done}/${saveProgress.total}…`;
  }, [saveProgress]);

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
        <DeferredFullscreenLoader active />
      </Container>
    );
  }

  const fabBottom = listPaddingBottom + 24;
  const toggleLabel = activeTab === 'map' ? 'List' : 'Map';
  const toggleIcon = activeTab === 'map' ? 'list.bullet' : 'map';

  const addTripModalBottomPad = 24 + insets.bottom;

  const addTripModalBody = (
    <>
      <Text variant="title" style={styles.modalTitle}>
        Add trip
      </Text>
      <Text variant="caption" color="secondary" style={styles.modalHint}>
        Add one or more photos. GPS is kept when you don&apos;t crop. If there&apos;s no location in the photos,
        search for a place or enter coordinates so your trip appears on the map.
      </Text>
      {photoUris.length > 1 ? (
        <View style={styles.addTripPreviewSection}>
          {Platform.OS === 'web' ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={[styles.addTripPreviewPager, { width: addTripPagerWidth }]}
              onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const x = e.nativeEvent.contentOffset.x;
                const page = Math.round(x / addTripPagerWidth);
                setAddTripPreviewIndex(Math.max(0, Math.min(photoUris.length - 1, page)));
              }}
            >
              {photoUris.map((uri, i) => (
                <Pressable
                  key={`preview-${uri}-${i}`}
                  onPress={() => openFullscreen(photoUris, i)}
                  style={{ width: addTripPagerWidth }}
                >
                  <Image
                    source={{ uri }}
                    style={[styles.addTripPreviewImage, { width: addTripPagerWidth }]}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <PagerView
              key={photoUris.join('|').slice(0, 120)}
              style={[styles.addTripPreviewPager, { width: addTripPagerWidth }]}
              initialPage={Math.min(addTripPreviewIndex, photoUris.length - 1)}
              onPageSelected={(e) => setAddTripPreviewIndex(e.nativeEvent.position)}
            >
              {photoUris.map((uri, i) => (
                <Pressable
                  key={`pv-${uri}-${i}`}
                  style={styles.pagerPageFill}
                  onPress={() => openFullscreen(photoUris, i)}
                >
                  <Image source={{ uri }} style={styles.addTripPreviewImageFill} resizeMode="cover" />
                </Pressable>
              ))}
            </PagerView>
          )}
          <View style={styles.photoPagerMeta}>
            <Text variant="caption" color="secondary">
              Swipe between photos · tap for full screen · {addTripPreviewIndex + 1} / {photoUris.length}
            </Text>
            <View style={styles.photoDotsRow}>
              {photoUris.map((_, i) => (
                <View
                  key={`dot-${i}`}
                  style={[
                    styles.photoDot,
                    { backgroundColor: theme.colors.borderMuted },
                    i === addTripPreviewIndex && { backgroundColor: theme.colors.primary, width: 8 },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      ) : null}
      {photoUris.length === 1 ? (
        <Pressable
          style={[styles.addTripSinglePreview, { width: addTripPagerWidth }]}
          onPress={() => openFullscreen(photoUris, 0)}
        >
          <Image
            source={{ uri: photoUris[0] }}
            style={[styles.addTripPreviewImage, { width: addTripPagerWidth }]}
            resizeMode="cover"
          />
          <Text variant="caption" color="secondary" style={styles.addTripSingleHint}>
            Tap for full screen
          </Text>
        </Pressable>
      ) : null}
      {photoUris.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripPhotoStrip} nestedScrollEnabled>
          {photoUris.map((uri, idx) => (
            <View key={`${uri}-${idx}`} style={styles.tripPhotoTile}>
              <Image source={{ uri }} style={styles.tripPhotoThumb} />
              <Pressable
                style={[styles.tripPhotoRemove, { backgroundColor: theme.colors.surface }]}
                onPress={() => removeTripPhotoAt(idx)}
                hitSlop={8}
                accessibilityLabel="Remove photo"
              >
                <DSIcon name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }} size={22} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <Button
        title={photoUris.length ? 'Add more photos' : 'Choose photos'}
        onPress={pickTripPhotos}
        variant={photoUris.length ? 'outline' : 'primary'}
        icon={<DSIcon name={{ ios: 'photo.fill.on.rectangle.fill', android: 'add_a_photo', web: 'add_a_photo' }} size={16} color={photoUris.length ? theme.colors.text : '#FFFFFF'} />}
        style={styles.choosePhotoBtn}
      />
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
        Pick a suggestion to place the pin accurately. Many edited or screenshot photos have no GPS — use search or
        coordinates in that case.
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
        <View style={styles.modalActionSlot}>
          <Button
            title="Cancel"
            variant="ghost"
            onPress={resetAddForm}
            style={styles.modalActionBtn}
          />
        </View>
        <View style={styles.modalActionSlotPrimary}>
          <Button
            title="Save trip"
            onPress={handleAdd}
            loading={saving}
            disabled={photoUris.length === 0}
            style={styles.modalActionBtn}
            icon={<DSIcon name={{ ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }} size={16} color="#FFFFFF" />}
          />
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      <DeferredFullscreenLoader active={saving} visibleSubtitle={saveProgressSubtitle} />
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
              const jc = jitterCoordsByKey.get(`travel-${t.id}`);
              return (
                <MapProfileMarker
                  key={t.id}
                  coordinate={{
                    latitude: jc?.latitude ?? t.latitude!,
                    longitude: jc?.longitude ?? t.longitude!,
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
            {memberHomes.map((h) => {
              const jc = jitterCoordsByKey.get(`home-${h.userId}`);
              return (
              <MapProfileMarker
                key={`home-${h.userId}`}
                coordinate={{
                  latitude: jc?.latitude ?? h.latitude,
                  longitude: jc?.longitude ?? h.longitude,
                }}
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
            );
            })}
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
          renderItem={({ item }) => {
            const rowPhotos = travelPhotoUrls(item);
            const rowThumb = rowPhotos[0];
            const openRowFullscreen = () => {
              const idx = rowPhotoIndexRef.current[item.id] ?? 0;
              openFullscreen(rowPhotos, idx);
            };
            const openTripDetail = () => setMapDetail({ kind: 'travel', travel: item });
            return (
            <View style={[styles.row, { borderBottomColor: theme.colors.borderMuted }]}>
              {/* Thumbnail + expand sit OUTSIDE the row Pressable so expand isn’t swallowed by the parent (RN hit testing). */}
              {rowPhotos.length > 1 ? (
                <View style={styles.rowThumbHost}>
                  {Platform.OS === 'web' ? (
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      style={styles.rowCarouselScroll}
                      contentContainerStyle={styles.rowCarouselContent}
                      onMomentumScrollEnd={(ev: NativeSyntheticEvent<NativeScrollEvent>) => {
                        const x = ev.nativeEvent.contentOffset.x;
                        const page = Math.round(x / ROW_THUMB_SIZE);
                        rowPhotoIndexRef.current[item.id] = Math.max(
                          0,
                          Math.min(rowPhotos.length - 1, page)
                        );
                      }}
                    >
                      {rowPhotos.map((uri, i) => (
                        <View key={`${item.id}-p-${i}`} style={styles.rowCarouselPage}>
                          <Image source={{ uri }} style={styles.rowCarouselImage} />
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <PagerView
                      key={`row-${item.id}-${rowPhotos.join('|').slice(0, 80)}`}
                      style={styles.rowCarouselScroll}
                      initialPage={0}
                      onPageSelected={(ev) => {
                        rowPhotoIndexRef.current[item.id] = ev.nativeEvent.position;
                      }}
                    >
                      {rowPhotos.map((uri, i) => (
                        <View key={`${item.id}-pv-${i}`} style={styles.rowCarouselPage}>
                          <Image source={{ uri }} style={styles.rowCarouselImage} />
                        </View>
                      ))}
                    </PagerView>
                  )}
                  <View style={[styles.rowPhotoCountBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text variant="caption" style={styles.rowPhotoCountText}>
                      {rowPhotos.length}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.rowExpandFab}
                    onPress={openRowFullscreen}
                    hitSlop={8}
                    accessibilityLabel="View photos full screen"
                  >
                    <DSIcon
                      name={{ ios: 'arrow.up.left.and.arrow.down.right', android: 'fullscreen', web: 'fullscreen' }}
                      size={16}
                      color="#FFFFFF"
                    />
                  </Pressable>
                </View>
              ) : rowThumb ? (
                <View style={styles.rowThumbHost}>
                  <Pressable style={styles.rowThumbPressable} onPress={openTripDetail} accessibilityRole="button">
                    <Image source={{ uri: rowThumb }} style={styles.rowImage} />
                  </Pressable>
                  <Pressable
                    style={styles.rowExpandFab}
                    onPress={openRowFullscreen}
                    hitSlop={8}
                    accessibilityLabel="View photo full screen"
                  >
                    <DSIcon
                      name={{ ios: 'arrow.up.left.and.arrow.down.right', android: 'fullscreen', web: 'fullscreen' }}
                      size={16}
                      color="#FFFFFF"
                    />
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.rowImage, styles.rowImagePlaceholder, { backgroundColor: theme.colors.surfaceSecondary }]} />
              )}
              <Pressable style={styles.rowMainPressable} onPress={openTripDetail} accessibilityRole="button">
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
            </View>
            );
          }}
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
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={resetAddForm}
            accessibilityLabel="Close add trip"
          />
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            {Platform.OS === 'web' ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                style={styles.modalKeyboardScroll}
                contentContainerStyle={[
                  styles.modalScrollContent,
                  { paddingBottom: addTripModalBottomPad },
                ]}
              >
                {addTripModalBody}
              </ScrollView>
            ) : (
              <KeyboardAwareScrollView
                bottomOffset={10}
                extraKeyboardSpace={12}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                style={styles.modalKeyboardScroll}
                contentContainerStyle={[
                  styles.modalScrollContent,
                  { paddingBottom: addTripModalBottomPad },
                ]}
              >
                {addTripModalBody}
              </KeyboardAwareScrollView>
            )}
          </View>
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
                {(() => {
                  const detailUrls = travelPhotoUrls(mapDetail.travel);
                  if (detailUrls.length === 0) return null;
                  return (
                    <View style={[styles.detailPhotoSection, { width: tripDetailPagerWidth }]}>
                      <View style={styles.detailPhotoPagerWrap}>
                        {Platform.OS === 'web' ? (
                          <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            style={[styles.detailPhotoPager, { width: tripDetailPagerWidth, height: 240 }]}
                            onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                              const x = e.nativeEvent.contentOffset.x;
                              const page = Math.round(x / tripDetailPagerWidth);
                              setTravelDetailPhotoIndex(
                                Math.max(0, Math.min(detailUrls.length - 1, page))
                              );
                            }}
                          >
                            {detailUrls.map((uri, i) => (
                              <Pressable
                                key={`${uri}-${i}`}
                                onPress={() => openFullscreen(detailUrls, i)}
                                style={{ width: tripDetailPagerWidth }}
                              >
                                <Image
                                  source={{ uri }}
                                  style={[styles.detailImage, { width: tripDetailPagerWidth }]}
                                  resizeMode="cover"
                                />
                              </Pressable>
                            ))}
                          </ScrollView>
                        ) : (
                          <PagerView
                            key={detailUrls.join('|').slice(0, 120)}
                            style={[styles.detailPhotoPager, { width: tripDetailPagerWidth, height: 240 }]}
                            initialPage={Math.min(travelDetailPhotoIndex, detailUrls.length - 1)}
                            onPageSelected={(e) => setTravelDetailPhotoIndex(e.nativeEvent.position)}
                          >
                            {detailUrls.map((uri, i) => (
                              <View key={`dpv-${uri}-${i}`} style={styles.detailPagerPage}>
                                <Image source={{ uri }} style={styles.detailImageFill} resizeMode="cover" />
                              </View>
                            ))}
                          </PagerView>
                        )}
                        <Pressable
                          style={styles.detailExpandFab}
                          onPress={() => openFullscreen(detailUrls, travelDetailPhotoIndex)}
                          hitSlop={8}
                          accessibilityLabel="View photos full screen"
                        >
                          <DSIcon
                            name={{
                              ios: 'arrow.up.left.and.arrow.down.right',
                              android: 'fullscreen',
                              web: 'fullscreen',
                            }}
                            size={20}
                            color="#FFFFFF"
                          />
                        </Pressable>
                      </View>
                      <View style={styles.photoPagerMeta}>
                        <Text variant="caption" color="secondary">
                          {detailUrls.length > 1
                            ? `Swipe for more · expand for full screen · ${travelDetailPhotoIndex + 1} / ${detailUrls.length}`
                            : 'Expand for full screen'}
                        </Text>
                        {detailUrls.length > 1 ? (
                          <View style={styles.photoDotsRow}>
                            {detailUrls.map((_, i) => (
                              <View
                                key={`ddot-${i}`}
                                style={[
                                  styles.photoDot,
                                  { backgroundColor: theme.colors.borderMuted },
                                  i === travelDetailPhotoIndex && {
                                    backgroundColor: theme.colors.primary,
                                    width: 8,
                                  },
                                ]}
                              />
                            ))}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })()}
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

      {/* Full-screen photo gallery */}
      <Modal
        visible={!!fullscreenGallery}
        animationType="fade"
        {...(Platform.OS === 'ios' ? { presentationStyle: 'fullScreen' as const } : {})}
        onRequestClose={() => {
          setFullscreenGallery(null);
          setFullscreenImageZoomed(false);
        }}
        statusBarTranslucent
      >
        <GestureHandlerRootView style={styles.fullscreenGestureRoot}>
          <View style={[styles.fullscreenRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <StatusBar style="light" />
            <View style={styles.fullscreenHeader}>
              <Pressable
                onPress={() => {
                  setFullscreenGallery(null);
                  setFullscreenImageZoomed(false);
                }}
                hitSlop={12}
                style={styles.fullscreenDoneBtn}
                accessibilityLabel="Close full screen photos"
              >
                <Text variant="body" style={styles.fullscreenDoneText}>
                  Done
                </Text>
              </Pressable>
              <View style={styles.fullscreenHeaderCenter}>
                {fullscreenGallery && fullscreenGallery.urls.length > 1 ? (
                  <Text variant="caption" style={styles.fullscreenIndexText}>
                    {fullscreenPhotoIndex + 1} / {fullscreenGallery.urls.length}
                  </Text>
                ) : null}
                {Platform.OS !== 'web' ? (
                  <Text variant="caption" style={styles.fullscreenHintText}>
                    Pinch to zoom · Pan when zoomed · Double-tap
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={saveCurrentFullscreenPhoto}
                disabled={savingFullscreenPhoto || !fullscreenGallery}
                hitSlop={12}
                style={styles.fullscreenSaveBtn}
                accessibilityLabel="Save photo to library"
              >
                <Text variant="body" style={[styles.fullscreenSaveText, savingFullscreenPhoto && styles.fullscreenSaveTextDisabled]}>
                  {savingFullscreenPhoto ? '…' : 'Save'}
                </Text>
              </Pressable>
            </View>
            {fullscreenGallery ? (
              (() => {
                const fsH = Math.max(280, windowHeight - insets.top - insets.bottom - 56);
                return Platform.OS === 'web' ? (
                  <ScrollView
                    ref={fullscreenScrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    style={[styles.fullscreenPager, { width: windowWidth, height: fsH }]}
                    onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                      const x = e.nativeEvent.contentOffset.x;
                      const page = Math.round(x / windowWidth);
                      setFullscreenPhotoIndex(
                        Math.max(0, Math.min(fullscreenGallery.urls.length - 1, page))
                      );
                      setFullscreenImageZoomed(false);
                    }}
                  >
                    {fullscreenGallery.urls.map((uri, i) => (
                      <View key={`fs-web-${i}`} style={[styles.fullscreenPage, { width: windowWidth, height: fsH }]}>
                        <FullscreenZoomablePhoto
                          uri={uri}
                          width={windowWidth}
                          height={fsH}
                          isActive={fullscreenPhotoIndex === i}
                          allowPan={fullscreenImageZoomed}
                          onZoomChange={setFullscreenImageZoomed}
                        />
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <PagerView
                    key={`fs-${fullscreenGallery.initialIndex}-${fullscreenGallery.urls.length}`}
                    style={[styles.fullscreenPager, { width: windowWidth, height: fsH }]}
                    initialPage={fullscreenGallery.initialIndex}
                    scrollEnabled={!fullscreenImageZoomed}
                    onPageSelected={(e) => {
                      setFullscreenPhotoIndex(e.nativeEvent.position);
                      setFullscreenImageZoomed(false);
                    }}
                  >
                    {fullscreenGallery.urls.map((uri, i) => (
                      <View key={`fs-n-${i}`} style={[styles.fullscreenPage, { height: fsH }]}>
                        <FullscreenZoomablePhoto
                          uri={uri}
                          width={windowWidth}
                          height={fsH}
                          isActive={fullscreenPhotoIndex === i}
                          allowPan={fullscreenImageZoomed}
                          onZoomChange={setFullscreenImageZoomed}
                        />
                      </View>
                    ))}
                  </PagerView>
                );
              })()
            ) : null}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
  },
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
    width: ROW_THUMB_SIZE,
    height: ROW_THUMB_SIZE,
    borderRadius: 12,
  },
  rowImagePlaceholder: {},
  /** List row thumbnail column (expand control is a sibling of the inner press target, not wrapped by the row Pressable). */
  rowThumbHost: {
    width: ROW_THUMB_SIZE,
    height: ROW_THUMB_SIZE,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  rowThumbPressable: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  rowMainPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  rowCarouselScroll: {
    width: ROW_THUMB_SIZE,
    height: ROW_THUMB_SIZE,
  },
  rowCarouselContent: {
    alignItems: 'center',
  },
  rowCarouselPage: {
    width: ROW_THUMB_SIZE,
    height: ROW_THUMB_SIZE,
  },
  rowCarouselImage: {
    width: ROW_THUMB_SIZE,
    height: ROW_THUMB_SIZE,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  rowPhotoCountBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowPhotoCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  rowExpandFab: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 4,
    padding: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  rowText: { flex: 1, minWidth: 0 },
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
    width: '100%',
    flexShrink: 1,
    zIndex: 1,
    elevation: 12,
  },
  modalKeyboardScroll: {
    flexGrow: 1,
    maxHeight: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  modalTitle: { marginBottom: 8 },
  modalHint: { marginBottom: 16 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  previewImage: { width: 100, height: 75, borderRadius: 12 },
  choosePhotoBtn: { marginBottom: 16 },
  addTripPreviewSection: {
    marginBottom: 12,
    alignItems: 'center',
  },
  addTripPreviewPager: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  addTripPreviewImage: {
    height: 200,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  pagerPageFill: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  addTripPreviewImageFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  addTripSinglePreview: {
    marginBottom: 12,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  addTripSingleHint: {
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  photoPagerMeta: {
    marginTop: 8,
    alignItems: 'center',
    gap: 6,
  },
  photoDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tripPhotoStrip: { marginBottom: 12, flexGrow: 0 },
  tripPhotoTile: {
    marginRight: 10,
    position: 'relative',
  },
  tripPhotoThumb: {
    width: 96,
    height: 72,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tripPhotoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 14,
    padding: 0,
  },
  input: { marginBottom: 12 },
  sectionLabel: { marginTop: 8, marginBottom: 4 },
  sectionHint: { marginBottom: 8 },
  coordRow: { flexDirection: 'row', gap: 12 },
  coordInput: { flex: 1 },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: '100%',
    gap: 12,
    marginTop: 24,
    alignItems: 'stretch',
  },
  modalActionSlot: {
    flex: 1,
    minWidth: 0,
  },
  modalActionSlotPrimary: {
    flex: 1.35,
    minWidth: 0,
  },
  modalActionBtn: {
    width: '100%',
  },
  detailContent: {
    marginHorizontal: 24,
    marginVertical: 80,
    borderRadius: 24,
    overflow: 'hidden',
  },
  detailPhotoSection: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  detailPhotoPagerWrap: {
    position: 'relative',
  },
  detailPhotoPager: {
    maxHeight: 240,
  },
  detailPagerPage: {
    flex: 1,
  },
  detailImage: {
    height: 240,
  },
  detailImageFill: {
    width: '100%',
    height: 240,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  detailExpandFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 4,
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  fullscreenGestureRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    minHeight: 52,
  },
  fullscreenHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 6,
  },
  fullscreenHintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textAlign: 'center',
  },
  fullscreenDoneBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 64,
  },
  fullscreenDoneText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  fullscreenIndexText: {
    color: 'rgba(255,255,255,0.72)',
  },
  fullscreenSaveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 56,
    alignItems: 'flex-end',
  },
  fullscreenSaveText: {
    color: '#7EB6FF',
    fontWeight: '600',
  },
  fullscreenSaveTextDisabled: {
    opacity: 0.45,
  },
  fullscreenPager: {
    flex: 1,
  },
  fullscreenPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
