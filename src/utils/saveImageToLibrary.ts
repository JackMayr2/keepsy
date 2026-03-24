import { Platform, Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '@/src/utils/logger';

function extensionFromUri(uri: string): string {
  try {
    const path = uri.split('?')[0];
    const m = path.match(/\.(jpe?g|png|webp|heic)$/i);
    return m ? m[0].toLowerCase() : '.jpg';
  } catch {
    return '.jpg';
  }
}

/**
 * Saves an image to the device photo library (native) or triggers a download (web).
 * Remote URLs are downloaded to cache first on native.
 */
export async function saveImageToLibraryFromUri(uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const res = await fetch(uri);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `keepsy-trip-${Date.now()}${extensionFromUri(uri)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      logger.error('saveImageToLibrary', 'web download failed', e);
      throw e;
    }
    return;
  }

  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) {
    Alert.alert(
      'Permission needed',
      'Allow access to save photos to your library in Settings.',
      [{ text: 'OK' }]
    );
    throw new Error('Media library permission denied');
  }

  let localUri = uri;
  if (/^https?:\/\//i.test(uri)) {
    const dir = FileSystem.cacheDirectory;
    if (!dir) throw new Error('No cache directory');
    const ext = extensionFromUri(uri);
    const dest = `${dir}keepsy-save-${Date.now()}${ext}`;
    const result = await FileSystem.downloadAsync(uri, dest);
    localUri = result.uri;
  }

  await MediaLibrary.saveToLibraryAsync(localUri);
}
