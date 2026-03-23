/**
 * OpenAI / DALL·E image URLs expire (often within ~1h). Firebase Storage URLs are stable.
 */
export function isFirebaseStorageDownloadUrl(url: string): boolean {
  return url.toLowerCase().includes('firebasestorage.googleapis.com');
}

/** True when we should copy the file into our bucket so it keeps loading. */
export function shouldRehostYearbookCoverUrl(url: string | null | undefined): url is string {
  if (!url || !url.startsWith('http')) return false;
  return !isFirebaseStorageDownloadUrl(url);
}

/** Same rule for any image field (covers, etc.): don’t persist non-Storage HTTP URLs in Firestore. */
export const shouldRehostRemoteImageUrl = shouldRehostYearbookCoverUrl;
