import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import type {
  DraftDoc,
  PagePlanEntry,
  PollDoc,
  PromptDoc,
  SuperlativeDoc,
  TravelDoc,
  UserDoc,
  YearbookCompilationDoc,
  CompilationSnapshot,
} from '../types';

const YEARBOOKS = 'yearbooks';
const YEARBOOK_MEMBERS = 'yearbookMembers';
const YEARBOOK_COMPILATIONS = 'yearbookCompilations';
const PROMPTS = 'prompts';
const DRAFTS = 'drafts';
const POLLS = 'polls';
const SUPERLATIVES = 'superlatives';
const TRAVELS = 'travels';
const USERS = 'users';

function parseCompilation(d: DocumentSnapshot): YearbookCompilationDoc | null {
  if (!d.exists()) return null;
  const data = d.data();
  return {
    id: d.id,
    yearbookId: (data.yearbookId as string) ?? d.id,
    phase: (data.phase as string) ?? 'compiling',
    pagePlan: (data.pagePlan as PagePlanEntry[]) ?? [],
    snapshot: (data.snapshot as CompilationSnapshot) ?? null,
    editorNotes: data.editorNotes ?? null,
    draftPdfUrl: data.draftPdfUrl ?? null,
    exportPdfUrl: data.exportPdfUrl ?? null,
  };
}

/** Yearbooks where the user is creator or admin and a compilation document exists. */
export async function listPrintStudioYearbooks(userId: string): Promise<
  Array<{ yearbookId: string; name: string; compilation: YearbookCompilationDoc }>
> {
  const db = getDb();
  const mq = query(collection(db, YEARBOOK_MEMBERS), where('userId', '==', userId));
  const memberSnap = await getDocs(mq);
  const out: Array<{ yearbookId: string; name: string; compilation: YearbookCompilationDoc }> = [];

  for (const m of memberSnap.docs) {
    const yearbookId = m.data().yearbookId as string;
    const role = m.data().role as string;
    if (role !== 'creator' && role !== 'admin') continue;

    const compRef = doc(db, YEARBOOK_COMPILATIONS, yearbookId);
    const compSnap = await getDoc(compRef);
    const compilation = parseCompilation(compSnap);
    if (!compilation) continue;

    const yRef = doc(db, YEARBOOKS, yearbookId);
    const ySnap = await getDoc(yRef);
    if (!ySnap.exists()) continue;
    const name = (ySnap.data().name as string) ?? 'Yearbook';

    out.push({ yearbookId, name, compilation });
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

async function getOne<T>(col: string, id: string): Promise<T | null> {
  const db = getDb();
  const s = await getDoc(doc(db, col, id));
  if (!s.exists()) return null;
  return { id: s.id, ...s.data() } as T;
}

export type ArchiveBundle = {
  yearbookName: string;
  compilation: YearbookCompilationDoc;
  prompts: Map<string, PromptDoc>;
  drafts: Map<string, DraftDoc>;
  polls: Map<string, PollDoc>;
  superlatives: Map<string, SuperlativeDoc>;
  travels: Map<string, TravelDoc>;
  users: Map<string, UserDoc>;
  /** `yearbookMembers` document id → Firebase Auth uid */
  memberDocToUserId: Map<string, string>;
};

export async function loadArchiveBundle(
  yearbookId: string,
  compilation: YearbookCompilationDoc
): Promise<ArchiveBundle | null> {
  const db = getDb();
  const ySnap = await getDoc(doc(db, YEARBOOKS, yearbookId));
  if (!ySnap.exists()) return null;
  const yearbookName = (ySnap.data().name as string) ?? 'Yearbook';
  const snap = compilation.snapshot;
  if (!snap) {
    return {
      yearbookName,
      compilation,
      prompts: new Map(),
      drafts: new Map(),
      polls: new Map(),
      superlatives: new Map(),
      travels: new Map(),
      users: new Map(),
      memberDocToUserId: new Map(),
    };
  }

  const prompts = new Map<string, PromptDoc>();
  const drafts = new Map<string, DraftDoc>();
  const polls = new Map<string, PollDoc>();
  const superlatives = new Map<string, SuperlativeDoc>();
  const travels = new Map<string, TravelDoc>();
  const users = new Map<string, UserDoc>();
  const memberDocToUserId = new Map<string, string>();

  const load = async <T>(ids: string[], col: string, map: Map<string, T>) => {
    await Promise.all(
      ids.map(async (id) => {
        const row = await getOne<T>(col, id);
        if (row) map.set(id, row);
      })
    );
  };

  await Promise.all([
    load(snap.promptIds, PROMPTS, prompts),
    load(snap.draftIds, DRAFTS, drafts),
    load(snap.pollIds, POLLS, polls),
    load(snap.superlativeIds, SUPERLATIVES, superlatives),
    load(snap.travelIds, TRAVELS, travels),
  ]);

  const memberUserIds = new Set<string>();
  for (const d of drafts.values()) memberUserIds.add(d.userId);
  for (const mid of snap.memberIds) {
    const mem = await getDoc(doc(db, YEARBOOK_MEMBERS, mid));
    if (mem.exists()) {
      const uid = mem.data().userId as string;
      if (uid) {
        memberUserIds.add(uid);
        memberDocToUserId.set(mid, uid);
      }
    }
  }

  await Promise.all(
    [...memberUserIds].map(async (uid) => {
      const u = await getOne<UserDoc>(USERS, uid);
      if (u) users.set(uid, u);
    })
  );

  return {
    yearbookName,
    compilation,
    prompts,
    drafts,
    polls,
    superlatives,
    travels,
    users,
    memberDocToUserId,
  };
}
