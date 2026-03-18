import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from '@/src/config/firebase';
import { logger } from '@/src/utils/logger';

const AVATAR_PATH = (uid: string) => `users/${uid}/avatar.jpg`;
const PROMPT_IMAGE_PATH = (yearbookId: string, promptId: string, userId: string) =>
  `yearbooks/${yearbookId}/prompts/${promptId}_${userId}.jpg`;

const TRAVEL_IMAGE_PATH = (yearbookId: string, userId: string, suffix: string) =>
  `yearbooks/${yearbookId}/travels/${userId}_${suffix}.jpg`;

/**
 * Upload a profile picture from a local URI (e.g. from expo-image-picker).
 * Returns the public download URL to store on the user document.
 */
export async function uploadProfileImage(uid: string, imageUri: string): Promise<string> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, AVATAR_PATH(uid));

  const response = await fetch(imageUri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
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

  const response = await fetch(imageUri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
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

  const response = await fetch(imageUri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  const downloadURL = await getDownloadURL(storageRef);
  logger.info('Storage', 'uploadTravelImage success', { yearbookId });
  return downloadURL;
}
