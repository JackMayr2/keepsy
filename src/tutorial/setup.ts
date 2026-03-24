import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/src/config/firebase';
import { createYearbookStarterPack, type YearbookStarterPackInput } from '@/src/services/firestore';
import { TUTORIAL_FRIENDS_PACK } from '@/src/tutorial/demoContent';
import { TUTORIAL_HOST_USER_ID, TUTORIAL_YEARBOOK_ID } from '@/src/tutorial/constants';

const YEARBOOKS = 'yearbooks';
const YEARBOOK_MEMBERS = 'yearbookMembers';

/** Creates the shared Firestore tutorial yearbook + starter pack if missing. */
export async function ensureTutorialYearbook(): Promise<string> {
  const db = getFirebaseDb();
  const ref = doc(db, YEARBOOKS, TUTORIAL_YEARBOOK_ID);
  const snap = await getDoc(ref);
  if (snap.exists()) return TUTORIAL_YEARBOOK_ID;
  await setDoc(ref, {
    name: 'Friends tutorial (demo)',
    type: 'friends',
    description:
      'Explore Keepsy with a sample crew. Your answers are saved for you; other visitors are not shown here.',
    dueDate: null,
    aiVisualUrl: null,
    inviteCode: 'KEEPSYTUT',
    createdBy: TUTORIAL_HOST_USER_ID,
    isTutorial: true,
    createdAt: new Date(),
  });
  const pack: YearbookStarterPackInput = {
    prompts: TUTORIAL_FRIENDS_PACK.prompts.map((p) => ({ text: p.text, type: p.type })),
    polls: TUTORIAL_FRIENDS_PACK.polls.map((p) => ({ question: p.question, options: [...p.options] })),
    superlatives: [...TUTORIAL_FRIENDS_PACK.superlatives],
  };
  await createYearbookStarterPack(TUTORIAL_YEARBOOK_ID, pack);
  return TUTORIAL_YEARBOOK_ID;
}

export async function joinTutorialYearbook(userId: string): Promise<void> {
  await ensureTutorialYearbook();
  const db = getFirebaseDb();
  const memberRef = doc(db, YEARBOOK_MEMBERS, `${TUTORIAL_YEARBOOK_ID}_${userId}`);
  const existing = await getDoc(memberRef);
  if (existing.exists()) return;
  await setDoc(memberRef, {
    yearbookId: TUTORIAL_YEARBOOK_ID,
    userId,
    role: 'member',
    joinedAt: new Date(),
  });
}
