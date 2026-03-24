import { Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.82;

/**
 * Downscale and recompress trip photos before upload (smaller payloads, faster uploads).
 */
export async function prepareTripPhotoForUpload(localUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return localUri;
  }
  const result = await manipulateAsync(
    localUri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: JPEG_QUALITY, format: SaveFormat.JPEG }
  );
  return result.uri;
}
