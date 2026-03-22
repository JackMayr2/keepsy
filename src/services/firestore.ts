import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/src/config/firebase';
import { logger } from '@/src/utils/logger';
import type { User, UserCreateInput } from '@/src/types/user.types';
import type { Yearbook, YearbookMember, YearbookMemberRole, YearbookWithRole } from '@/src/types/yearbook.types';
import type { Prompt, Draft, DraftStatus } from '@/src/types/prompt.types';

const USERS = 'users';
const YEARBOOKS = 'yearbooks';
const YEARBOOK_MEMBERS = 'yearbookMembers';
const PROMPTS = 'prompts';
const DRAFTS = 'drafts';

export async function getUser(uid: string): Promise<User | null> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, USERS, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      logger.debug('Firestore', 'getUser: no doc', { uid });
      return null;
    }
    const data = snap.data();
    return {
    id: snap.id,
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    email: data.email ?? '',
    bio: data.bio,
    photoURL: data.photoURL,
    city: data.city,
    homeLatitude: data.homeLatitude ?? null,
    homeLongitude: data.homeLongitude ?? null,
    birthday: data.birthday,
    socialLinks: data.socialLinks,
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
  };
  } catch (e) {
    logger.error('Firestore', 'getUser failed', e);
    throw e;
  }
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  (Object.keys(obj) as (keyof T)[]).forEach((k) => {
    const v = obj[k];
    if (v !== undefined) out[k as string] = v;
  });
  return out;
}

export async function createUser(uid: string, input: UserCreateInput): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, USERS, uid);
    await setDoc(ref, {
      ...omitUndefined(input as unknown as Record<string, unknown>),
      createdAt: new Date(),
    });
    logger.info('Firestore', 'createUser success', { uid });
  } catch (e) {
    logger.error('Firestore', 'createUser failed', e);
    throw e;
  }
}

export async function updateUser(uid: string, updates: Partial<UserCreateInput>): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const cleaned = omitUndefined(updates as unknown as Record<string, unknown>);
  await setDoc(ref, { ...snap.data(), ...cleaned }, { merge: true });
}

// Yearbooks
export async function getMemberRole(
  yearbookId: string,
  userId: string
): Promise<YearbookMemberRole | null> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, YEARBOOK_MEMBERS),
    where('yearbookId', '==', yearbookId),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first ? (first.data().role as YearbookMemberRole) : null;
}

export async function getYearbookMembers(yearbookId: string): Promise<YearbookMember[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, YEARBOOK_MEMBERS),
    where('yearbookId', '==', yearbookId)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      yearbookId: data.yearbookId,
      userId: data.userId,
      role: (data.role as YearbookMemberRole) ?? 'member',
      joinedAt: data.joinedAt?.toDate?.() ?? data.joinedAt,
    };
  });
  list.sort((a, b) => {
    const aAt = a.joinedAt instanceof Date ? a.joinedAt.getTime() : 0;
    const bAt = b.joinedAt instanceof Date ? b.joinedAt.getTime() : 0;
    return aAt - bAt;
  });
  return list;
}

export async function updateYearbook(
  yearbookId: string,
  updates: { name?: string; description?: string; dueDate?: string; aiVisualUrl?: string | null }
): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, YEARBOOKS, yearbookId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  await setDoc(ref, { ...snap.data(), ...updates }, { merge: true });
}

export async function getYearbook(id: string): Promise<Yearbook | null> {
  const db = getFirebaseDb();
  const ref = doc(db, YEARBOOKS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name ?? '',
    description: data.description,
    dueDate: data.dueDate,
    aiVisualUrl: data.aiVisualUrl,
    inviteCode: data.inviteCode ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
  };
}

export async function getYearbooksForUser(userId: string): Promise<Array<YearbookWithRole>> {
  try {
    const db = getFirebaseDb();
    const membersRef = collection(db, YEARBOOK_MEMBERS);
    const q = query(membersRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    const docs = [...snap.docs].sort((a, b) => {
    const aAt = a.data().joinedAt?.toDate?.()?.getTime() ?? 0;
    const bAt = b.data().joinedAt?.toDate?.()?.getTime() ?? 0;
    return bAt - aAt;
  });
  const out: Array<YearbookWithRole> = [];
  for (const d of docs) {
    const memberData = d.data();
    const yearbook = await getYearbook(memberData.yearbookId);
    if (yearbook)
      out.push({
        ...yearbook,
        role: (memberData.role as YearbookMemberRole) ?? 'member',
      });
  }
    logger.debug('Firestore', 'getYearbooksForUser', { userId, count: out.length });
    return out;
  } catch (e) {
    logger.error('Firestore', 'getYearbooksForUser failed', e);
    throw e;
  }
}

export async function leaveYearbook(yearbookId: string, userId: string): Promise<void> {
  const db = getFirebaseDb();
  const membersRef = collection(db, YEARBOOK_MEMBERS);
  const q = query(membersRef, where('yearbookId', '==', yearbookId), where('userId', '==', userId));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export async function createYearbook(
  userId: string,
  input: { name: string; description?: string; dueDate?: string; aiVisualUrl?: string | null }
): Promise<string> {
  const db = getFirebaseDb();
  const yearbookRef = doc(collection(db, YEARBOOKS));
  const id = yearbookRef.id;
  const inviteCode = generateInviteCode();
  await setDoc(yearbookRef, {
    name: input.name,
    description: input.description ?? '',
    dueDate: input.dueDate ?? null,
    aiVisualUrl: input.aiVisualUrl ?? null,
    inviteCode,
    createdBy: userId,
    createdAt: new Date(),
  });
  await setDoc(doc(db, YEARBOOK_MEMBERS, `${id}_${userId}`), {
    yearbookId: id,
    userId,
    role: 'creator',
    joinedAt: new Date(),
  });
  // Seed defaults so the yearbook has prompts, polls, and superlatives immediately
  try {
    await ensureDefaultPrompts(id);
    await ensureDefaultPolls(id);
    await ensureDefaultSuperlatives(id);
  } catch (e) {
    logger.warn('Firestore', 'seed defaults after createYearbook failed', e);
  }
  return id;
}

export async function getYearbookByInviteCode(code: string): Promise<Yearbook | null> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, YEARBOOKS),
    where('inviteCode', '==', code.toUpperCase().trim())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    id: d.id,
    name: data.name ?? '',
    description: data.description,
    dueDate: data.dueDate,
    aiVisualUrl: data.aiVisualUrl,
    inviteCode: data.inviteCode ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
  };
}

export async function joinYearbookByCode(
  inviteCode: string,
  userId: string
): Promise<{ yearbookId: string } | { error: string }> {
  const yearbook = await getYearbookByInviteCode(inviteCode);
  if (!yearbook) return { error: 'Invalid or expired code' };
  const db = getFirebaseDb();
  const memberId = `${yearbook.id}_${userId}`;
  const memberRef = doc(db, YEARBOOK_MEMBERS, memberId);
  const existing = await getDoc(memberRef);
  if (existing.exists()) return { error: 'You are already in this yearbook' };
  await setDoc(memberRef, {
    yearbookId: yearbook.id,
    userId,
    role: 'member',
    joinedAt: new Date(),
  });
  return { yearbookId: yearbook.id };
}

// Prompts
const DEFAULT_PROMPTS: Array<{ text: string; type: 'text' | 'photo' }> = [
  { text: 'What’s your favorite memory from this year?', type: 'text' },
  { text: 'Share a photo from formal', type: 'photo' },
  { text: 'One word that describes you', type: 'text' },
  { text: 'What’s your go-to karaoke song?', type: 'text' },
  { text: 'Share a photo that always makes you smile', type: 'photo' },
  { text: 'If you could have coffee with anyone, who would it be?', type: 'text' },
  { text: 'What’s the best advice you’ve ever received?', type: 'text' },
  { text: 'Post a pic from your favorite trip', type: 'photo' },
  { text: 'Describe your perfect weekend in three words', type: 'text' },
  { text: 'What’s your hidden talent?', type: 'text' },
  { text: 'Share a throwback photo that sums up the vibe', type: 'photo' },
  { text: 'What’s your comfort food?', type: 'text' },
];

export async function getPrompts(yearbookId: string): Promise<Prompt[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, PROMPTS),
    where('yearbookId', '==', yearbookId)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      yearbookId: data.yearbookId,
      text: data.text ?? '',
      type: (data.type as Prompt['type']) ?? 'text',
      order: data.order ?? 0,
      isDefault: data.isDefault ?? false,
    };
  });
  list.sort((a, b) => a.order - b.order);
  return list;
}

export async function ensureDefaultPrompts(yearbookId: string): Promise<void> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, PROMPTS),
    where('yearbookId', '==', yearbookId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return;
  for (let i = 0; i < DEFAULT_PROMPTS.length; i++) {
    const p = DEFAULT_PROMPTS[i];
    const ref = doc(collection(db, PROMPTS));
    await setDoc(ref, {
      yearbookId,
      text: p.text,
      type: p.type,
      order: i,
      isDefault: true,
    });
  }
}

export async function saveDraft(
  yearbookId: string,
  promptId: string,
  userId: string,
  content: string,
  status: DraftStatus,
  photoURL?: string
): Promise<void> {
  const db = getFirebaseDb();
  const id = `${yearbookId}_${promptId}_${userId}`;
  const ref = doc(db, DRAFTS, id);
  const payload: Record<string, unknown> = {
    yearbookId,
    promptId,
    userId,
    content: content ?? '',
    status,
    updatedAt: new Date(),
  };
  if (photoURL != null) payload.photoURL = photoURL;
  await setDoc(ref, payload, { merge: true });
}

export async function getDraftsForUser(
  userId: string,
  yearbookId?: string
): Promise<Draft[]> {
  const db = getFirebaseDb();
  let q = query(
    collection(db, DRAFTS),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  const snap = await getDocs(q);
  let list = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      yearbookId: data.yearbookId,
      promptId: data.promptId,
      userId: data.userId,
      content: data.content ?? '',
      photoURL: data.photoURL,
      status: (data.status as DraftStatus) ?? 'draft',
      updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
    };
  });
  if (yearbookId) list = list.filter((x) => x.yearbookId === yearbookId);
  return list;
}

/** Submissions (drafts with status 'submitted') for a yearbook, optionally for one prompt. */
export async function getSubmissionsForPrompt(
  yearbookId: string,
  promptId?: string
): Promise<Draft[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, DRAFTS),
    where('yearbookId', '==', yearbookId),
    where('status', '==', 'submitted')
  );
  const snap = await getDocs(q);
  let list = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      yearbookId: data.yearbookId,
      promptId: data.promptId,
      userId: data.userId,
      content: data.content ?? '',
      photoURL: data.photoURL,
      status: 'submitted' as const,
      updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
    };
  });
  if (promptId) list = list.filter((x) => x.promptId === promptId);
  return list;
}

// Polls
const POLLS = 'polls';
const POLL_VOTES = 'pollVotes';

export async function getPolls(yearbookId: string): Promise<Array<{
  id: string;
  yearbookId: string;
  question: string;
  options: string[];
}>> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, POLLS),
    where('yearbookId', '==', yearbookId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      yearbookId: data.yearbookId,
      question: data.question ?? '',
      options: data.options ?? [],
    };
  });
}

export async function votePoll(pollId: string, userId: string, optionIndex: number): Promise<void> {
  const db = getFirebaseDb();
  const id = `${pollId}_${userId}`;
  await setDoc(doc(db, POLL_VOTES, id), { pollId, userId, optionIndex });
}

export async function getUserVote(pollId: string, userId: string): Promise<number | null> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, POLL_VOTES),
    where('pollId', '==', pollId),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first != null ? first.data().optionIndex as number : null;
}

export async function getPollResults(pollId: string): Promise<number[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, POLL_VOTES), where('pollId', '==', pollId));
  const snap = await getDocs(q);
  const counts: number[] = [];
  snap.docs.forEach((d) => {
    const idx = d.data().optionIndex as number;
    counts[idx] = (counts[idx] ?? 0) + 1;
  });
  return counts;
}

const DEFAULT_POLLS: Array<{ question: string; options: string[] }> = [
  { question: 'Best way to spend a Saturday?', options: ['Brunch crew', 'Sleep in', 'Adventure day', 'Cozy night in'] },
  { question: 'Go-to study snack?', options: ['Coffee + pastry', 'Trail mix', 'Fruit', 'Something crunchy'] },
  { question: 'Perfect group size for a night out?', options: ['Just 2–3', 'Squad of 5', 'The more the merrier', 'Solo mission'] },
  { question: 'What’s your getting-ready vibe?', options: ['Music up, full glam', 'Quick & cute', 'Comfy is key', 'Depends on the day'] },
  { question: 'Favorite way to celebrate?', options: ['Dinner & drinks', 'Dance party', 'Something low-key', 'Surprise me'] },
];

export async function ensureDefaultPolls(yearbookId: string): Promise<void> {
  const db = getFirebaseDb();
  const q = query(collection(db, POLLS), where('yearbookId', '==', yearbookId));
  const snap = await getDocs(q);
  if (!snap.empty) return;
  for (const p of DEFAULT_POLLS) {
    const ref = doc(collection(db, POLLS));
    await setDoc(ref, {
      yearbookId,
      question: p.question,
      options: p.options,
    });
  }
}

// Superlatives
const SUPERLATIVES = 'superlatives';

const DEFAULT_SUPERLATIVES: string[] = [
  'Most likely to become famous',
  'Most likely to show up late (but with snacks)',
  'Best dressed',
  'Most likely to start a group chat at 2am',
  'Biggest hype person',
  'Most likely to remember everyone’s birthday',
  'Best laugh',
  'Most likely to say "we should hang out soon" and mean it',
  'Coziest vibe',
  'Most likely to have a spreadsheet for it',
  'Best road trip buddy',
  'Most likely to make you smile',
];

export async function getSuperlatives(yearbookId: string): Promise<Array<{
  id: string;
  yearbookId: string;
  category: string;
  nominations: Record<string, string>;
}>> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, SUPERLATIVES),
    where('yearbookId', '==', yearbookId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      yearbookId: data.yearbookId,
      category: data.category ?? '',
      nominations: data.nominations ?? {},
    };
  });
}

export async function ensureDefaultSuperlatives(yearbookId: string): Promise<void> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, SUPERLATIVES),
    where('yearbookId', '==', yearbookId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return;
  for (const category of DEFAULT_SUPERLATIVES) {
    const ref = doc(collection(db, SUPERLATIVES));
    await setDoc(ref, {
      yearbookId,
      category,
      nominations: {},
    });
  }
}

export async function nominateSuperlative(
  superlativeId: string,
  userId: string,
  nominatedUserId: string
): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, SUPERLATIVES, superlativeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const nominations = { ...(snap.data().nominations ?? {}), [userId]: nominatedUserId };
  await setDoc(ref, { ...snap.data(), nominations }, { merge: true });
}

// Travels
const TRAVELS = 'travels';

export type Travel = {
  id: string;
  yearbookId: string;
  userId: string;
  photoURL?: string | null;
  placeName?: string | null;
  notes?: string | null;
  caption?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  taggedUserIds: string[];
  createdAt: unknown;
};

export async function getTravels(yearbookId: string): Promise<Travel[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, TRAVELS),
    where('yearbookId', '==', yearbookId)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      yearbookId: data.yearbookId,
      userId: data.userId,
      photoURL: data.photoURL ?? null,
      placeName: data.placeName ?? null,
      notes: data.notes ?? null,
      caption: data.caption ?? data.notes ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      taggedUserIds: data.taggedUserIds ?? [],
      createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    };
  });
  list.sort((a, b) => {
    const toMs = (x: unknown): number => {
      if (x instanceof Date) return x.getTime();
      if (x && typeof (x as { toDate: () => Date }).toDate === 'function') return (x as { toDate: () => Date }).toDate().getTime();
      return 0;
    };
    return toMs(b.createdAt) - toMs(a.createdAt);
  });
  return list;
}

export async function createTravel(
  yearbookId: string,
  userId: string,
  input: {
    placeName?: string | null;
    notes?: string | null;
    caption?: string | null;
    photoURL?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    taggedUserIds?: string[];
  }
): Promise<string> {
  const db = getFirebaseDb();
  const ref = doc(collection(db, TRAVELS));
  const caption = input.caption ?? input.notes ?? null;
  await setDoc(ref, {
    yearbookId,
    userId,
    placeName: input.placeName ?? null,
    notes: input.notes ?? null,
    caption: caption ?? null,
    photoURL: input.photoURL ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    taggedUserIds: input.taggedUserIds ?? [],
    createdAt: new Date(),
  });
  return ref.id;
}
