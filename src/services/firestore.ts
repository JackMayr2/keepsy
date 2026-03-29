import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/src/config/firebase';
import { logger } from '@/src/utils/logger';
import type { User, UserCreateInput } from '@/src/types/user.types';
import type {
  Yearbook,
  YearbookCompilation,
  YearbookCompileStatus,
  YearbookMember,
  YearbookMemberRole,
  YearbookPhase,
  YearbookPrintStatus,
  YearbookWithRole,
  YearbookType,
} from '@/src/types/yearbook.types';
import type { Prompt, Draft, DraftStatus } from '@/src/types/prompt.types';
import { effectiveYearbookPhase } from '@/src/utils/yearbookLifecycle';

const USERS = 'users';
const YEARBOOKS = 'yearbooks';
const YEARBOOK_MEMBERS = 'yearbookMembers';
const PROMPTS = 'prompts';
const DRAFTS = 'drafts';
const YEARBOOK_COMPILATIONS = 'yearbookCompilations';

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
    const code = (e as { code?: string })?.code;
    if (code === 'permission-denied') {
      logger.warn('Firestore', 'getUser permission denied; returning null', { uid });
      return null;
    }
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

async function requireMemberRole(
  yearbookId: string,
  userId: string
): Promise<YearbookMemberRole> {
  const role = await getMemberRole(yearbookId, userId);
  if (!role) throw new Error('You are not a member of this yearbook');
  return role;
}

async function assertCanContribute(
  yearbookId: string,
  userId: string
): Promise<{ yearbook: Yearbook; role: YearbookMemberRole; phase: YearbookPhase }> {
  const yearbook = await getYearbook(yearbookId);
  if (!yearbook) throw new Error('Yearbook not found');
  const role = await requireMemberRole(yearbookId, userId);
  const phase = effectiveYearbookPhase(yearbook);
  if (phase !== 'active' && role !== 'creator' && role !== 'admin') {
    throw new Error('This yearbook is locked for member contributions');
  }
  return { yearbook, role, phase };
}

async function assertCanModerate(
  yearbookId: string,
  userId: string
): Promise<{ yearbook: Yearbook; role: YearbookMemberRole; phase: YearbookPhase }> {
  const yearbook = await getYearbook(yearbookId);
  if (!yearbook) throw new Error('Yearbook not found');
  const role = await requireMemberRole(yearbookId, userId);
  if (role !== 'creator' && role !== 'admin') {
    throw new Error('Only creators/admins can do this');
  }
  return { yearbook, role, phase: effectiveYearbookPhase(yearbook) };
}

async function assertCreator(
  yearbookId: string,
  userId: string
): Promise<Yearbook> {
  const yearbook = await getYearbook(yearbookId);
  if (!yearbook) throw new Error('Yearbook not found');
  if (yearbook.createdBy !== userId) {
    throw new Error('Only the creator can do this');
  }
  return yearbook;
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
  updates: {
    name?: string;
    type?: YearbookType;
    description?: string;
    dueDate?: string;
    aiVisualUrl?: string | null;
    phase?: YearbookPhase;
    lockedAt?: Date | null;
    lockedBy?: string | null;
    reviewCompletedAt?: Date | null;
    reviewCompletedBy?: string | null;
    compileStatus?: YearbookCompileStatus;
    printStatus?: YearbookPrintStatus;
    archiveUrl?: string | null;
    editorDraftUrl?: string | null;
    selectedThemeId?: string | null;
  }
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
    type: (data.type as YearbookType | undefined) ?? undefined,
    description: data.description,
    dueDate: data.dueDate,
    aiVisualUrl: data.aiVisualUrl,
    inviteCode: data.inviteCode ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    phase: data.phase as YearbookPhase | undefined,
    lockedAt: data.lockedAt?.toDate?.() ?? data.lockedAt ?? null,
    lockedBy: data.lockedBy ?? null,
    reviewCompletedAt: data.reviewCompletedAt?.toDate?.() ?? data.reviewCompletedAt ?? null,
    reviewCompletedBy: data.reviewCompletedBy ?? null,
    compileStatus: (data.compileStatus as YearbookCompileStatus | undefined) ?? 'idle',
    printStatus: (data.printStatus as YearbookPrintStatus | undefined) ?? 'idle',
    archiveUrl: data.archiveUrl ?? null,
    editorDraftUrl: data.editorDraftUrl ?? null,
    selectedThemeId: data.selectedThemeId ?? null,
    isTutorial: data.isTutorial === true,
  };
}

export async function getYearbooksForUser(userId: string): Promise<Array<YearbookWithRole>> {
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
    try {
      const yearbook = await getYearbook(memberData.yearbookId);
      if (yearbook) {
        out.push({
          ...yearbook,
          role: (memberData.role as YearbookMemberRole) ?? 'member',
        });
      }
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'permission-denied') {
        logger.warn('Firestore', 'Skipping yearbook due to permissions', {
          yearbookId: memberData.yearbookId,
          memberDocId: d.id,
        });
        continue;
      }
      throw e;
    }
  }
  logger.debug('Firestore', 'getYearbooksForUser', { userId, count: out.length });
  return out;
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

/** Only the yearbook creator may change another member’s role (not the creator’s own). */
export async function updateYearbookMemberRoleByCreator(
  yearbookId: string,
  actorUserId: string,
  targetUserId: string,
  newRole: 'admin' | 'member'
): Promise<void> {
  const yb = await getYearbook(yearbookId);
  if (!yb) throw new Error('Yearbook not found');
  if (yb.createdBy !== actorUserId) throw new Error('Only the creator can change roles');
  if (targetUserId === yb.createdBy) throw new Error('Cannot change the creator role');
  const db = getFirebaseDb();
  const ref = doc(db, YEARBOOK_MEMBERS, `${yearbookId}_${targetUserId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Member not found');
  await setDoc(ref, { ...snap.data(), role: newRole }, { merge: true });
}

/** Only the creator may remove another member (not themselves or the creator account). */
export async function removeYearbookMemberByCreator(
  yearbookId: string,
  actorUserId: string,
  targetUserId: string
): Promise<void> {
  const yb = await getYearbook(yearbookId);
  if (!yb) throw new Error('Yearbook not found');
  if (yb.createdBy !== actorUserId) throw new Error('Only the creator can remove members');
  if (targetUserId === yb.createdBy) throw new Error('Cannot remove the creator');
  const db = getFirebaseDb();
  await deleteDoc(doc(db, YEARBOOK_MEMBERS, `${yearbookId}_${targetUserId}`));
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export async function createYearbook(
  userId: string,
  input: { name: string; type?: YearbookType; description?: string; dueDate?: string; aiVisualUrl?: string | null },
  options?: { seedDefaults?: boolean }
): Promise<string> {
  const db = getFirebaseDb();
  const yearbookRef = doc(collection(db, YEARBOOKS));
  const id = yearbookRef.id;
  const inviteCode = generateInviteCode();
  await setDoc(yearbookRef, {
    name: input.name,
    type: input.type ?? 'other',
    description: input.description ?? '',
    dueDate: input.dueDate ?? null,
    aiVisualUrl: input.aiVisualUrl ?? null,
    inviteCode,
    createdBy: userId,
    createdAt: new Date(),
    phase: 'active',
    compileStatus: 'idle',
    printStatus: 'idle',
    archiveUrl: null,
    editorDraftUrl: null,
    selectedThemeId: null,
  });
  await setDoc(doc(db, YEARBOOK_MEMBERS, `${id}_${userId}`), {
    yearbookId: id,
    userId,
    role: 'creator',
    joinedAt: new Date(),
  });
  if (options?.seedDefaults !== false) {
    // Seed defaults so the yearbook has prompts, polls, and superlatives immediately
    try {
      await ensureDefaultPrompts(id);
      await ensureDefaultPolls(id);
      await ensureDefaultSuperlatives(id);
    } catch (e) {
      logger.warn('Firestore', 'seed defaults after createYearbook failed', e);
    }
  }
  return id;
}

export type YearbookStarterPackInput = {
  prompts: Array<{ text: string; type: Prompt['type'] }>;
  polls: Array<{ question: string; options: string[] }>;
  superlatives: string[];
};

/**
 * Writes a curated starter pack in one batch immediately after yearbook creation.
 */
export async function createYearbookStarterPack(
  yearbookId: string,
  pack: YearbookStarterPackInput
): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  pack.prompts.forEach((p, i) => {
    const text = p.text.trim();
    if (!text) return;
    const ref = doc(collection(db, PROMPTS));
    batch.set(ref, {
      yearbookId,
      text,
      type: p.type,
      order: i,
      isDefault: true,
    });
  });

  pack.polls.forEach((p) => {
    const question = p.question.trim();
    const options = p.options.map((x) => x.trim()).filter(Boolean);
    if (!question || options.length < 2) return;
    const ref = doc(collection(db, POLLS));
    batch.set(ref, {
      yearbookId,
      question,
      options,
    });
  });

  pack.superlatives.forEach((category) => {
    const c = category.trim();
    if (!c) return;
    const ref = doc(collection(db, SUPERLATIVES));
    batch.set(ref, {
      yearbookId,
      category: c,
      nominations: {},
    });
  });

  await batch.commit();
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
    type: (data.type as YearbookType | undefined) ?? undefined,
    description: data.description,
    dueDate: data.dueDate,
    aiVisualUrl: data.aiVisualUrl,
    inviteCode: data.inviteCode ?? '',
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    phase: data.phase as YearbookPhase | undefined,
    lockedAt: data.lockedAt?.toDate?.() ?? data.lockedAt ?? null,
    lockedBy: data.lockedBy ?? null,
    reviewCompletedAt: data.reviewCompletedAt?.toDate?.() ?? data.reviewCompletedAt ?? null,
    reviewCompletedBy: data.reviewCompletedBy ?? null,
    compileStatus: (data.compileStatus as YearbookCompileStatus | undefined) ?? 'idle',
    printStatus: (data.printStatus as YearbookPrintStatus | undefined) ?? 'idle',
    archiveUrl: data.archiveUrl ?? null,
    editorDraftUrl: data.editorDraftUrl ?? null,
    selectedThemeId: data.selectedThemeId ?? null,
    isTutorial: data.isTutorial === true,
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

export async function createPromptForYearbook(
  yearbookId: string,
  actorUserId: string,
  text: string,
  type: Prompt['type']
): Promise<string> {
  await assertCanModerate(yearbookId, actorUserId);
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Prompt text is required');
  const existing = await getPrompts(yearbookId);
  const maxOrder = existing.length ? Math.max(...existing.map((p) => p.order)) : -1;
  const db = getFirebaseDb();
  const ref = doc(collection(db, PROMPTS));
  await setDoc(ref, {
    yearbookId,
    text: trimmed,
    type,
    order: maxOrder + 1,
    isDefault: false,
  });
  return ref.id;
}

/** Deletes the prompt and all drafts that reference it. */
export async function deletePromptAndDrafts(promptId: string, actorUserId: string): Promise<void> {
  const db = getFirebaseDb();
  const promptRef = doc(db, PROMPTS, promptId);
  const promptSnap = await getDoc(promptRef);
  if (!promptSnap.exists()) throw new Error('Prompt not found');
  const yearbookId = promptSnap.data().yearbookId as string;
  await assertCanModerate(yearbookId, actorUserId);
  const draftQ = query(collection(db, DRAFTS), where('promptId', '==', promptId));
  const draftSnap = await getDocs(draftQ);
  const batch = writeBatch(db);
  draftSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(promptRef);
  await batch.commit();
}

export async function saveDraft(
  yearbookId: string,
  promptId: string,
  userId: string,
  content: string,
  status: DraftStatus,
  photoURL?: string
): Promise<void> {
  await assertCanContribute(yearbookId, userId);
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

/** Single draft for the current user on a prompt (doc id is deterministic). */
export async function getDraftForPrompt(
  yearbookId: string,
  promptId: string,
  userId: string
): Promise<Draft | null> {
  const db = getFirebaseDb();
  const docId = `${yearbookId}_${promptId}_${userId}`;
  const ref = doc(db, DRAFTS, docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    yearbookId: data.yearbookId,
    promptId: data.promptId,
    userId: data.userId,
    content: data.content ?? '',
    photoURL: data.photoURL,
    status: (data.status as DraftStatus) ?? 'draft',
    updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
  };
}

function draftUpdatedAtMs(d: Draft): number {
  const u = d.updatedAt;
  if (u instanceof Date) return u.getTime();
  if (u && typeof u === 'object' && 'seconds' in u && typeof (u as { seconds: number }).seconds === 'number') {
    return (u as { seconds: number }).seconds * 1000;
  }
  return 0;
}

export async function getDraftsForUser(
  userId: string,
  yearbookId?: string
): Promise<Draft[]> {
  const db = getFirebaseDb();
  // Single-field equality only — avoids composite index (userId + orderBy updatedAt).
  const q = query(collection(db, DRAFTS), where('userId', '==', userId));
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
  list.sort((a, b) => draftUpdatedAtMs(b) - draftUpdatedAtMs(a));
  return list;
}

/** Submissions (drafts with status 'submitted') for a yearbook, optionally for one prompt. */
export async function getSubmissionsForPrompt(
  yearbookId: string,
  promptId?: string
): Promise<Draft[]> {
  const db = getFirebaseDb();
  // Prefer a narrow query when possible — avoids loading every submission in the yearbook (JS freeze).
  const constraints =
    promptId != null && promptId !== ''
      ? [
          where('yearbookId', '==', yearbookId),
          where('promptId', '==', promptId),
          where('status', '==', 'submitted'),
        ]
      : [where('yearbookId', '==', yearbookId), where('status', '==', 'submitted')];
  const q = query(collection(db, DRAFTS), ...constraints);
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => {
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
  const pollRef = doc(db, POLLS, pollId);
  const pollSnap = await getDoc(pollRef);
  if (!pollSnap.exists()) throw new Error('Poll not found');
  const yearbookId = pollSnap.data().yearbookId as string;
  await assertCanContribute(yearbookId, userId);
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

export async function createPollForYearbook(
  yearbookId: string,
  actorUserId: string,
  question: string,
  options: string[]
): Promise<string> {
  await assertCanModerate(yearbookId, actorUserId);
  const q = question.trim();
  const opts = options.map((x) => x.trim()).filter(Boolean);
  if (!q || opts.length < 2) throw new Error('Add a question and at least two options');
  const db = getFirebaseDb();
  const ref = doc(collection(db, POLLS));
  await setDoc(ref, { yearbookId, question: q, options: opts });
  return ref.id;
}

/** Deletes the poll and all votes for it. */
export async function deletePollAndVotes(pollId: string, actorUserId: string): Promise<void> {
  const db = getFirebaseDb();
  const pollRef = doc(db, POLLS, pollId);
  const pollSnap = await getDoc(pollRef);
  if (!pollSnap.exists()) throw new Error('Poll not found');
  const yearbookId = pollSnap.data().yearbookId as string;
  await assertCanModerate(yearbookId, actorUserId);
  const voteQ = query(collection(db, POLL_VOTES), where('pollId', '==', pollId));
  const voteSnap = await getDocs(voteQ);
  const batch = writeBatch(db);
  voteSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(pollRef);
  await batch.commit();
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

export async function createSuperlativeForYearbook(
  yearbookId: string,
  actorUserId: string,
  category: string
): Promise<string> {
  await assertCanModerate(yearbookId, actorUserId);
  const c = category.trim();
  if (!c) throw new Error('Category is required');
  const db = getFirebaseDb();
  const ref = doc(collection(db, SUPERLATIVES));
  await setDoc(ref, { yearbookId, category: c, nominations: {} });
  return ref.id;
}

export async function deleteSuperlativeById(superlativeId: string, actorUserId: string): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, SUPERLATIVES, superlativeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Superlative not found');
  const yearbookId = snap.data().yearbookId as string;
  await assertCanModerate(yearbookId, actorUserId);
  await deleteDoc(ref);
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
  const yearbookId = snap.data().yearbookId as string;
  await assertCanContribute(yearbookId, userId);
  const nominations = { ...(snap.data().nominations ?? {}), [userId]: nominatedUserId };
  await setDoc(ref, { ...snap.data(), nominations }, { merge: true });
}

// Travels
const TRAVELS = 'travels';

export type Travel = {
  id: string;
  yearbookId: string;
  userId: string;
  /** @deprecated Prefer photoURLs; kept for older docs */
  photoURL?: string | null;
  /** Multiple trip photos (new); falls back to [photoURL] when absent */
  photoURLs?: string[] | null;
  placeName?: string | null;
  notes?: string | null;
  caption?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  taggedUserIds: string[];
  createdAt: unknown;
};

function travelCreatedAtToMs(x: unknown): number {
  if (x instanceof Date) return x.getTime();
  if (x && typeof (x as { toDate: () => Date }).toDate === 'function') {
    return (x as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

/** Newest first — matches `getTravels` ordering. */
export function sortTravelsByCreatedAtDesc(list: Travel[]): Travel[] {
  return [...list].sort((a, b) => travelCreatedAtToMs(b.createdAt) - travelCreatedAtToMs(a.createdAt));
}

/**
 * Merge a server snapshot with previous client state. Server wins for ids present in both.
 * Keeps client-only ids so a trip still appears if the collection query is briefly stale after create.
 */
export function mergeTravelsWithPreviousServer(server: Travel[], previous: Travel[]): Travel[] {
  const byId = new Map<string, Travel>();
  for (const t of server) byId.set(t.id, t);
  for (const t of previous) {
    if (!byId.has(t.id)) byId.set(t.id, t);
  }
  return sortTravelsByCreatedAtDesc([...byId.values()]);
}

/** Normalized photo list for UI (handles legacy single photoURL). */
export function travelPhotoUrls(t: Pick<Travel, 'photoURL' | 'photoURLs'>): string[] {
  const arr = t.photoURLs;
  if (Array.isArray(arr) && arr.length > 0) {
    const filtered = arr.filter(Boolean) as string[];
    return [...new Set(filtered)];
  }
  return t.photoURL ? [t.photoURL] : [];
}

const COLLAGE_MAX_SUBMISSIONS_SCAN = 120;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dedupePhotoUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export type YearbookCollagePhotos = {
  urls: string[];
  /** Unique photo URLs (trips + prompt submissions; submissions scan capped). */
  totalMemories: number;
};

function collectAllFlatPhotoUrlsForCollage(travels: Travel[], submissions: Draft[]): string[] {
  const allFlat: string[] = [];
  for (const t of travels) {
    for (const u of travelPhotoUrls(t)) allFlat.push(u);
  }
  let scanned = 0;
  for (const s of submissions) {
    if (scanned >= COLLAGE_MAX_SUBMISSIONS_SCAN) break;
    scanned += 1;
    if (s.photoURL) allFlat.push(s.photoURL);
  }
  return allFlat;
}

/**
 * Up to `max` image URLs for home-card collage: prefers variety (one random photo per trip,
 * one random per submitting user), shuffles, then fills randomly if needed.
 */
export async function getYearbookCollagePhotoUrls(yearbookId: string, max = 4): Promise<YearbookCollagePhotos> {
  const [travels, submissionsRaw] = await Promise.all([
    getTravels(yearbookId),
    getSubmissionsForPrompt(yearbookId),
  ]);
  const submissions = [...submissionsRaw].sort((a, b) => draftUpdatedAtMs(b) - draftUpdatedAtMs(a));

  const allUnique = dedupePhotoUrls(collectAllFlatPhotoUrlsForCollage(travels, submissions));
  const totalMemories = allUnique.length;

  const diverse: string[] = [];

  for (const t of shuffleArray(travels)) {
    const urls = travelPhotoUrls(t);
    if (urls.length === 0) continue;
    diverse.push(urls[Math.floor(Math.random() * urls.length)]!);
  }

  const byUser = new Map<string, typeof submissions>();
  for (const s of submissions) {
    if (!s.photoURL) continue;
    const list = byUser.get(s.userId) ?? [];
    list.push(s);
    byUser.set(s.userId, list);
  }
  for (const drafts of byUser.values()) {
    const withPhoto = drafts.filter((d) => d.photoURL);
    if (withPhoto.length === 0) continue;
    const pick = withPhoto[Math.floor(Math.random() * withPhoto.length)]!;
    diverse.push(pick.photoURL!);
  }

  let pool = dedupePhotoUrls(diverse);
  pool = shuffleArray(pool);

  if (pool.length < max) {
    const seen = new Set(pool);
    for (const u of shuffleArray(allUnique)) {
      if (pool.length >= max) break;
      if (seen.has(u)) continue;
      seen.add(u);
      pool.push(u);
    }
  }

  return { urls: pool.slice(0, max), totalMemories };
}

export async function getTravels(yearbookId: string): Promise<Travel[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, TRAVELS),
    where('yearbookId', '==', yearbookId)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => {
    const data = d.data();
    const photoURLsRaw = data.photoURLs;
    const photoURLs = Array.isArray(photoURLsRaw)
      ? (photoURLsRaw.filter(Boolean) as string[])
      : null;
    const single = data.photoURL ?? null;
    return {
      id: d.id,
      yearbookId: data.yearbookId,
      userId: data.userId,
      photoURL: single,
      photoURLs: photoURLs?.length ? photoURLs : single ? [single] : null,
      placeName: data.placeName ?? null,
      notes: data.notes ?? null,
      caption: data.caption ?? data.notes ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      taggedUserIds: data.taggedUserIds ?? [],
      createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    };
  });
  return sortTravelsByCreatedAtDesc(list);
}

export async function createTravel(
  yearbookId: string,
  userId: string,
  input: {
    placeName?: string | null;
    notes?: string | null;
    caption?: string | null;
    photoURL?: string | null;
    photoURLs?: string[] | null;
    latitude?: number | null;
    longitude?: number | null;
    taggedUserIds?: string[];
  }
): Promise<string> {
  await assertCanContribute(yearbookId, userId);
  const db = getFirebaseDb();
  const ref = doc(collection(db, TRAVELS));
  const caption = input.caption ?? input.notes ?? null;
  const urls =
    input.photoURLs != null && input.photoURLs.length > 0
      ? input.photoURLs.filter(Boolean)
      : input.photoURL
        ? [input.photoURL]
        : [];
  const primary = urls[0] ?? null;
  await setDoc(ref, {
    yearbookId,
    userId,
    placeName: input.placeName ?? null,
    notes: input.notes ?? null,
    caption: caption ?? null,
    photoURL: primary,
    photoURLs: urls.length > 0 ? urls : null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    taggedUserIds: input.taggedUserIds ?? [],
    createdAt: new Date(),
  });
  return ref.id;
}

export async function setYearbookPhaseByCreator(
  yearbookId: string,
  actorUserId: string,
  phase: YearbookPhase
): Promise<void> {
  const yearbook = await assertCreator(yearbookId, actorUserId);
  const now = new Date();
  const updates: Parameters<typeof updateYearbook>[1] = {
    phase,
  };
  if (phase === 'locked') {
    updates.lockedAt = now;
    updates.lockedBy = actorUserId;
  }
  if (phase === 'review') {
    updates.lockedAt = yearbook.lockedAt instanceof Date ? yearbook.lockedAt : now;
    updates.lockedBy = yearbook.lockedBy ?? actorUserId;
  }
  if (phase === 'active') {
    updates.compileStatus = 'idle';
    updates.printStatus = 'idle';
  }
  await updateYearbook(yearbookId, updates);
}

type CompilationSnapshot = {
  promptIds: string[];
  draftIds: string[];
  pollIds: string[];
  superlativeIds: string[];
  travelIds: string[];
  memberIds: string[];
};

async function buildCompilationSnapshot(yearbookId: string): Promise<CompilationSnapshot> {
  const [prompts, polls, superlatives, travels, members, submissions] = await Promise.all([
    getPrompts(yearbookId),
    getPolls(yearbookId),
    getSuperlatives(yearbookId),
    getTravels(yearbookId),
    getYearbookMembers(yearbookId),
    getSubmissionsForPrompt(yearbookId),
  ]);
  return {
    promptIds: prompts.map((x) => x.id),
    draftIds: submissions.map((x) => x.id),
    pollIds: polls.map((x) => x.id),
    superlativeIds: superlatives.map((x) => x.id),
    travelIds: travels.map((x) => x.id),
    memberIds: members.map((x) => x.id),
  };
}

function deterministicPagePlan(snapshot: CompilationSnapshot, themeId: string | null): YearbookCompilation['pagePlan'] {
  const sections = [
    { key: 'cover', items: ['cover'] },
    { key: 'members', items: snapshot.memberIds },
    { key: 'prompts', items: snapshot.promptIds },
    { key: 'polls', items: snapshot.pollIds },
    { key: 'superlatives', items: snapshot.superlativeIds },
    { key: 'travels', items: snapshot.travelIds },
    { key: 'closing', items: ['closing'] },
  ];
  let page = 1;
  const plan: YearbookCompilation['pagePlan'] = [];
  for (const section of sections) {
    const chunkSize = section.key === 'cover' || section.key === 'closing' ? 1 : 4;
    if (section.items.length === 0) continue;
    for (let i = 0; i < section.items.length; i += chunkSize) {
      const chunk = section.items.slice(i, i + chunkSize);
      plan.push({
        pageNumber: page++,
        section: section.key,
        layout: `${themeId ?? 'classic'}_${section.key}_${chunk.length}`,
        items: chunk,
      });
    }
  }
  return plan;
}

export async function createYearbookCompilationSnapshot(
  yearbookId: string,
  actorUserId: string,
  selectedThemeId: string | null
): Promise<string> {
  const db = getFirebaseDb();
  const yearbook = await assertCreator(yearbookId, actorUserId);
  if (effectiveYearbookPhase(yearbook) !== 'review') {
    throw new Error('Yearbook must be in review to start compilation');
  }
  const snapshot = await buildCompilationSnapshot(yearbookId);
  const pagePlan = deterministicPagePlan(snapshot, selectedThemeId);
  const ref = doc(db, YEARBOOK_COMPILATIONS, yearbookId);
  await setDoc(ref, {
    yearbookId,
    phase: 'compiling',
    createdAt: new Date(),
    createdBy: actorUserId,
    selectedThemeId: selectedThemeId ?? null,
    sectionOrder: ['cover', 'members', 'prompts', 'polls', 'superlatives', 'travels', 'closing'],
    compileStatus: 'queued',
    printStatus: 'idle',
    pagePlan,
    snapshot,
    editorNotes: null,
    draftPdfUrl: null,
    exportPdfUrl: null,
    archiveUrl: null,
    printPackageUrl: null,
  });
  await updateYearbook(yearbookId, {
    phase: 'compiling',
    compileStatus: 'queued',
    printStatus: 'idle',
    selectedThemeId: selectedThemeId ?? null,
  });
  return ref.id;
}

export async function runYearbookPrintPipeline(
  compilationId: string,
  actorUserId: string
): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, YEARBOOK_COMPILATIONS, compilationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Compilation not found');
  const data = snap.data();
  const yearbookId = data.yearbookId as string;
  await assertCreator(yearbookId, actorUserId);
  await setDoc(
    ref,
    {
      compileStatus: 'succeeded',
      printStatus: 'ready',
      draftPdfUrl: `keepsy://yearbooks/${yearbookId}/compilations/${compilationId}/draft.pdf`,
      printPackageUrl: `keepsy://yearbooks/${yearbookId}/compilations/${compilationId}/print.zip`,
      phase: 'editableDraft',
    },
    { merge: true }
  );
  await updateYearbook(yearbookId, {
    phase: 'editableDraft',
    compileStatus: 'succeeded',
    printStatus: 'ready',
    editorDraftUrl: `keepsy://yearbooks/${yearbookId}/compilations/${compilationId}/editor`,
  });
}

export async function getLatestCompilationForYearbook(
  yearbookId: string
): Promise<YearbookCompilation | null> {
  const db = getFirebaseDb();
  const d = await getDoc(doc(db, YEARBOOK_COMPILATIONS, yearbookId));
  if (!d.exists()) return null;
  const data = d.data();
  return {
    id: d.id,
    yearbookId: data.yearbookId,
    phase: (data.phase as YearbookPhase) ?? 'compiling',
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    createdBy: data.createdBy ?? '',
    selectedThemeId: data.selectedThemeId ?? null,
    sectionOrder: data.sectionOrder ?? [],
    compileStatus: (data.compileStatus as YearbookCompileStatus) ?? 'idle',
    printStatus: (data.printStatus as YearbookPrintStatus) ?? 'idle',
    pagePlan: data.pagePlan ?? [],
    editorNotes: data.editorNotes ?? null,
    draftPdfUrl: data.draftPdfUrl ?? null,
    exportPdfUrl: data.exportPdfUrl ?? null,
    archiveUrl: data.archiveUrl ?? null,
    printPackageUrl: data.printPackageUrl ?? null,
  };
}

export async function updateCompilationEditorialDraft(
  compilationId: string,
  actorUserId: string,
  updates: {
    pagePlan?: YearbookCompilation['pagePlan'];
    editorNotes?: string;
  }
): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, YEARBOOK_COMPILATIONS, compilationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Compilation not found');
  const data = snap.data();
  const yearbookId = data.yearbookId as string;
  await assertCanModerate(yearbookId, actorUserId);
  await setDoc(
    ref,
    {
      pagePlan: updates.pagePlan ?? data.pagePlan ?? [],
      editorNotes: updates.editorNotes ?? data.editorNotes ?? null,
      phase: 'editableDraft',
    },
    { merge: true }
  );
}

export async function finalizeCompilationAndExport(
  compilationId: string,
  actorUserId: string
): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, YEARBOOK_COMPILATIONS, compilationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Compilation not found');
  const data = snap.data();
  const yearbookId = data.yearbookId as string;
  await assertCreator(yearbookId, actorUserId);
  const exportPdfUrl = `keepsy://yearbooks/${yearbookId}/compilations/${compilationId}/export.pdf`;
  const archiveUrl = `keepsy://yearbooks/${yearbookId}/archive/index.json`;
  await setDoc(
    ref,
    {
      phase: 'archived',
      exportPdfUrl,
      archiveUrl,
    },
    { merge: true }
  );
  await updateYearbook(yearbookId, {
    phase: 'archived',
    archiveUrl,
    compileStatus: 'succeeded',
    printStatus: 'ready',
  });
}

export async function markYearbookReviewDoneByCreator(
  yearbookId: string,
  actorUserId: string,
  selectedThemeId: string | null
): Promise<{ compilationId: string }> {
  const yearbook = await assertCreator(yearbookId, actorUserId);
  const phase = effectiveYearbookPhase(yearbook);
  if (phase !== 'locked' && phase !== 'review') {
    throw new Error('Yearbook must be locked before review can be completed');
  }
  await updateYearbook(yearbookId, {
    phase: 'review',
    reviewCompletedAt: new Date(),
    reviewCompletedBy: actorUserId,
    selectedThemeId: selectedThemeId ?? null,
  });
  const compilationId = await createYearbookCompilationSnapshot(
    yearbookId,
    actorUserId,
    selectedThemeId
  );
  await runYearbookPrintPipeline(compilationId, actorUserId);
  return { compilationId };
}
