/** Stable Firestore yearbook id for the shared interactive tutorial (friends demo). */
export const TUTORIAL_YEARBOOK_ID = 'keepsy_tutorial_friends_v1';

/** Synthetic “creator” id stored on the yearbook doc — not a real Auth user. */
export const TUTORIAL_HOST_USER_ID = 'keepsy_demo_host';

export const DEMO_USER_PREFIX = 'keepsy_demo_';

export function isTutorialYearbook(yearbookId: string | undefined | null): boolean {
  return yearbookId === TUTORIAL_YEARBOOK_ID;
}

export function isDemoUserId(userId: string | undefined | null): boolean {
  return !!userId && (userId.startsWith(DEMO_USER_PREFIX) || userId === TUTORIAL_HOST_USER_ID);
}
