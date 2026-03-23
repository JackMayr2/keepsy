import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from '@/src/config/firebase';
import { logger } from '@/src/utils/logger';

/**
 * Fetch image bytes from a remote URL (e.g. DALL·E) or local URI (e.g. image picker).
 * Ensures HTTP(S) responses are OK before uploading to Firebase Storage.
 */
export async function fetchImageBlobForStorage(uri: string): Promise<{ blob: Blob; contentType: string }> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Image download failed (${response.status})`);
  }
  const blob = await response.blob();
  const contentType =
    blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  return { blob, contentType };
}

const AVATAR_PATH = (uid: string) => `users/${uid}/avatar.jpg`;
const PROMPT_IMAGE_PATH = (yearbookId: string, promptId: string, userId: string) =>
  `yearbooks/${yearbookId}/prompts/${promptId}_${userId}.jpg`;

const TRAVEL_IMAGE_PATH = (yearbookId: string, userId: string, suffix: string) =>
  `yearbooks/${yearbookId}/travels/${userId}_${suffix}.jpg`;

const YEARBOOK_COVER_PATH = (yearbookId: string) => `yearbooks/${yearbookId}/cover.jpg`;

/**
 * Upload a profile picture from a local URI (e.g. from expo-image-picker).
 * Returns the public download URL to store on the user document.
 */
export async function uploadProfileImage(uid: string, imageUri: string): Promise<string> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, AVATAR_PATH(uid));

  const { blob, contentType } = await fetchImageBlobForStorage(imageUri);

  await uploadBytes(storageRef, blob, { contentType });
  const downloadURL = await getDownloadURL(storageRef);
  logger.info('Storage', 'uploadProfileImage success', { uid });
  return downloadURL;
}

/**
 * Upload a prompt response image. Returns the public download URL for the draft.
 */
export async function uploadPromptImage(
  yearbookId: string,
  promptId: string,
  userId: string,
  imageUri: string
): Promise<string> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, PROMPT_IMAGE_PATH(yearbookId, promptId, userId));

  const { blob, contentType } = await fetchImageBlobForStorage(imageUri);

  await uploadBytes(storageRef, blob, { contentType });
  const downloadURL = await getDownloadURL(storageRef);
  logger.info('Storage', 'uploadPromptImage success', { yearbookId, promptId });
  return downloadURL;
}

/**
 * Upload a travel/trip photo. Returns the public download URL for the travel.
 */
export async function uploadTravelImage(
  yearbookId: string,
  userId: string,
  imageUri: string
): Promise<string> {
  const storage = getFirebaseStorage();
  const suffix = Date.now();
  const storageRef = ref(storage, TRAVEL_IMAGE_PATH(yearbookId, userId, String(suffix)));

  const { blob, contentType } = await fetchImageBlobForStorage(imageUri);

  await uploadBytes(storageRef, blob, { contentType });
  const downloadURL = await getDownloadURL(storageRef);
  logger.info('Storage', 'uploadTravelImage success', { yearbookId });
  return downloadURL;
}

/**
 * Download a remote cover (e.g. temporary DALL·E URL) and upload to Firebase Storage.
 * Returns a stable download URL for Firestore.
 */
export async function uploadYearbookCoverFromRemoteUrl(
  yearbookId: string,
  remoteUrl: string
): Promise<string> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, YEARBOOK_COVER_PATH(yearbookId));
  const { blob, contentType } = await fetchImageBlobForStorage(remoteUrl);
  await uploadBytes(storageRef, blob, { contentType });
  const downloadURL = await getDownloadURL(storageRef);
  logger.info('Storage', 'uploadYearbookCoverFromRemoteUrl success', { yearbookId });
  return downloadURL;
}
