import type { Draft, Prompt } from '@/src/types/prompt.types';
import { DEMO_PERSONAS, TUTORIAL_HOST } from '@/src/tutorial/personas';
import { isDemoUserId, TUTORIAL_HOST_USER_ID, TUTORIAL_YEARBOOK_ID } from '@/src/tutorial/constants';

/** Friends-themed starter pack for the tutorial yearbook (matches create flow “friends” vibe). */
export const TUTORIAL_FRIENDS_PACK = {
  prompts: [
    { text: 'What was your favorite hang with this crew this year?', type: 'text' },
    { text: 'Share a photo that captures the friend group vibe', type: 'photo' },
    { text: 'What inside joke should we remember forever?', type: 'text' },
    { text: 'Post a candid from a trip, party, or lazy Sunday', type: 'photo' },
    { text: 'What are you most grateful your friends got you through?', type: 'text' },
    { text: 'What should we do together next year?', type: 'text' },
  ],
  polls: [
    {
      question: 'Best way to spend a Saturday?',
      options: ['Brunch first', 'Adventure day', 'Movie marathon', 'Absolutely nothing'],
    },
    {
      question: 'Group chat energy?',
      options: ['Chaotic good', 'Wholesome', 'Memes only', 'Making plans nobody keeps'],
    },
    {
      question: 'Snack for the road trip?',
      options: ['Gummy candy', 'Chips', 'Coffee + pastry', 'Whatever is in the glove box'],
    },
  ],
  superlatives: [
    'Most likely to host the reunion',
    'Best playlist curator',
    'Most likely to text “omw” and not be',
    'Best group photo taker',
    'Most likely to bring snacks for everyone',
    'Most likely to turn a hang into an adventure',
  ],
} as const;

const TEXT_ANSWER_POOL = [
  'Late-night diner run after the concert — we laughed until we cried.',
  'Game night that turned into an impromptu dance party in the kitchen.',
  'Beach day that turned into a spontaneous sunset drive.',
  'Still quoting “the burrito incident” from spring break.',
  'The group chat name changes every week and I love it.',
  'Finals week, moving day, and that one brutal Monday — you all showed up.',
  'Honestly? Just being the people I text when I need a pep talk.',
  'Road trip to the coast: three playlists, zero plans, perfect day.',
  'Trying that new climbing gym then tacos after — we should repeat monthly.',
  'So many memories — hard to pick just one!',
];

/** Eight “friends” who submitted text answers (host + seven personas) — stable order. */
const TEXT_SUBMITTERS: string[] = [
  TUTORIAL_HOST_USER_ID,
  ...DEMO_PERSONAS.slice(0, 7).map((p) => p.id),
];

/**
 * Per text-prompt (Firestore `order` index: 0, 2, 4, 5) — unique copy so each prompt feels alive.
 * Must align with TUTORIAL_FRIENDS_PACK prompt order.
 */
const TEXT_ANSWERS_BY_ORDER: Record<number, string[]> = {
  0: [
    'The rooftop hang in July — nobody wanted to leave even when it got cold.',
    'Alex’s birthday when we surprised them at the restaurant. Pure chaos, perfect night.',
    'Lazy Sunday at the park with snacks and way too many photos.',
    'That random Tuesday when we all ended up at karaoke until closing.',
    'Road trip playlist on blast, someone brought gas-station candy for everyone.',
    'Game night turned into a heart-to-heart and I’m still thinking about it.',
    'Brunch that lasted until dinner — no regrets.',
    'Beach cleanup day with the crew. Felt good doing something together.',
  ],
  2: [
    'The “pineapple incident.” If you know, you know.',
    'Anytime someone says “five minutes” and it’s never five minutes.',
    'The group chat sticker war that lasted a whole week.',
    'Code name for the friend who always loses their keys.',
    'That voice note from 2am that we still replay.',
    'The birthday candle that took four tries to blow out.',
    '“We should leave by 9” — we left at midnight.',
    'The secret handshake that isn’t secret anymore.',
  ],
  4: [
    'Rough weeks when you all checked in without me asking.',
    'Getting through a move — boxes, pizza, and patience.',
    'Job interviews and pep talks in the group chat.',
    'Heartbreak season — you showed up with ice cream and zero judgment.',
    'Family stuff — you listened more than you had to.',
    'Health scares and hospital visits — I wasn’t alone.',
    'Burnout — you reminded me to rest.',
    'Celebrating the small wins when I couldn’t see them myself.',
  ],
  5: [
    'Annual cabin trip — I’ll organize the spreadsheet.',
    'Cooking class together (even if we burn something).',
    'Volunteer day then tacos after.',
    'More beach days. More disposable cameras.',
    'Holiday potluck with the ridiculous white-elephant gifts.',
    'Try that new hike everyone keeps tagging.',
    'Book club that becomes wine club — no complaints.',
    'Another concert where we lose our voices.',
  ],
};

/** Photo prompts at order 1 and 3 — six friends each (host + five personas). */
const PHOTO_SUBMITTERS: string[] = [
  TUTORIAL_HOST_USER_ID,
  ...DEMO_PERSONAS.slice(0, 5).map((p) => p.id),
];

const PHOTO_SEEDS = ['tutph1', 'tutph2', 'tutph3', 'tutph4', 'tutph5', 'tutph6'];

/** Photo URLs for photo prompts (indices 1 and 3). */
const PHOTO_URLS = PHOTO_SEEDS.map((s) => `https://picsum.photos/seed/${s}/400/300`);

function pickDemoUser(i: number): string {
  return DEMO_PERSONAS[i % DEMO_PERSONAS.length]!.id;
}

function pickDemoUserOffset(i: number, offset: number): string {
  return DEMO_PERSONAS[(i + offset) % DEMO_PERSONAS.length]!.id;
}

function now(): Date {
  return new Date();
}

/** How many sample submissions we show per prompt (for list UI + modal). */
export function getTutorialDemoSubmissionCountForPrompt(promptOrderIndex: number): number {
  if (promptOrderIndex === 1 || promptOrderIndex === 3) return PHOTO_SUBMITTERS.length;
  return TEXT_SUBMITTERS.length;
}

/** Synthetic submitted drafts for the demo — never includes real Firestore users. */
export function buildSyntheticDemoSubmissionsForPrompt(
  yearbookId: string,
  promptId: string,
  promptOrderIndex: number
): Draft[] {
  const rows: Draft[] = [];
  if (promptOrderIndex === 1 || promptOrderIndex === 3) {
    PHOTO_SUBMITTERS.forEach((uid, i) => {
      rows.push({
        id: `demo_${promptId}_${uid}`,
        yearbookId,
        promptId,
        userId: uid,
        content: '',
        photoURL: PHOTO_URLS[i % PHOTO_URLS.length],
        status: 'submitted',
        updatedAt: now(),
      });
    });
    return rows;
  }

  const lines = TEXT_ANSWERS_BY_ORDER[promptOrderIndex];
  for (let i = 0; i < TEXT_SUBMITTERS.length; i++) {
    const uid = TEXT_SUBMITTERS[i]!;
    const text =
      lines?.[i] ?? TEXT_ANSWER_POOL[(promptOrderIndex * 8 + i) % TEXT_ANSWER_POOL.length] ?? '';
    rows.push({
      id: `demo_${promptId}_${uid}`,
      yearbookId,
      promptId,
      userId: uid,
      content: text,
      status: 'submitted',
      updatedAt: now(),
    });
  }
  return rows;
}

/**
 * Prompt answer rows for a demo user’s profile in the tutorial yearbook
 * (same synthetic data as the Prompts tab).
 */
export function buildTutorialDemoProfilePromptRows(
  yearbookId: string,
  profileUserId: string,
  prompts: Prompt[]
): Array<{ prompt: Prompt; draft: Draft }> {
  const sorted = [...prompts].sort((a, b) => a.order - b.order);
  const rows: Array<{ prompt: Prompt; draft: Draft }> = [];
  sorted.forEach((p, orderIdx) => {
    const subs = buildSyntheticDemoSubmissionsForPrompt(yearbookId, p.id, orderIdx);
    const mine = subs.find((s) => s.userId === profileUserId);
    if (!mine || mine.status !== 'submitted') return;
    const hasText = Boolean(mine.content?.trim());
    const hasPhoto = Boolean(mine.photoURL);
    if (!hasText && !hasPhoto) return;
    rows.push({ prompt: p, draft: mine });
  });
  return rows;
}

/** Filter Firestore submissions: only you + demo personas (no other real users). */
export function filterTutorialSubmissions(submissions: Draft[], viewerId: string | undefined): Draft[] {
  return submissions.filter(
    (s) => (viewerId != null && s.userId === viewerId) || isDemoUserId(s.userId)
  );
}

/** Merge demo + real submissions; dedupe by userId for same prompt. */
export function mergeTutorialPromptSubmissions(
  yearbookId: string,
  promptId: string,
  promptOrderIndex: number,
  fromFirestore: Draft[],
  viewerId: string | undefined
): Draft[] {
  const filtered = filterTutorialSubmissions(fromFirestore, viewerId);
  const synthetic = buildSyntheticDemoSubmissionsForPrompt(yearbookId, promptId, promptOrderIndex);
  const byUser = new Map<string, Draft>();
  for (const s of synthetic) byUser.set(s.userId, s);
  for (const s of filtered) byUser.set(s.userId, s);
  return [...byUser.values()].sort((a, b) => {
    const ta = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
    const tb = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
    return tb - ta;
  });
}

/** Base vote counts for tutorial polls (fake distribution). User vote adds on top in UI. */
export function tutorialPollBaseCounts(pollIndex: number, optionCount: number): number[] {
  const presets: number[][] = [
    [9, 14, 5, 11],
    [12, 6, 15, 8],
    [7, 10, 13, 18],
  ];
  const base = presets[pollIndex % presets.length] ?? Array(optionCount).fill(4);
  const out = base.slice(0, optionCount);
  while (out.length < optionCount) out.push(3);
  return out;
}

/** Tutorial results = base demo tallies + one vote for current user if they voted. */
export function tutorialPollDisplayCounts(
  pollIndex: number,
  optionCount: number,
  userVote: number | null
): number[] {
  const base = tutorialPollBaseCounts(pollIndex, optionCount);
  if (userVote == null || userVote < 0 || userVote >= optionCount) return base;
  const out = [...base];
  out[userVote] += 1;
  return out;
}

/** Default nominations: demo nominators → demo nominees (by superlative index). */
export function tutorialSuperlativeBaseNominations(
  superlativeIndex: number
): Record<string, string> {
  const n = DEMO_PERSONAS.length;
  const a = pickDemoUser(superlativeIndex);
  const b = pickDemoUserOffset(superlativeIndex, 3);
  const c = pickDemoUserOffset(superlativeIndex, 6);
  const d = pickDemoUserOffset(superlativeIndex, 9);
  return {
    [pickDemoUser(0)]: a,
    [pickDemoUser(1)]: b,
    [pickDemoUser(2)]: c,
    [pickDemoUser(3)]: d,
  };
}

export function mergeTutorialSuperlativeNominations(
  superlativeIndex: number,
  raw: Record<string, string>,
  viewerId: string | undefined
): Record<string, string> {
  const base = tutorialSuperlativeBaseNominations(superlativeIndex);
  const out: Record<string, string> = { ...base };
  for (const [from, to] of Object.entries(raw)) {
    if (viewerId && from === viewerId) {
      if (isDemoUserId(to) || to === viewerId) out[from] = to;
      continue;
    }
    if (isDemoUserId(from) && isDemoUserId(to)) out[from] = to;
  }
  return out;
}

export function getTutorialDemoTravels(): Array<{
  id: string;
  yearbookId: string;
  userId: string;
  photoURLs: string[];
  placeName: string;
  caption: string | null;
  latitude: number;
  longitude: number;
  taggedUserIds: string[];
  createdAt: Date;
}> {
  const yb = TUTORIAL_YEARBOOK_ID;
  const pairs: Array<{ lat: number; lng: number; place: string; uid: string; seed: string }> = [
    { lat: 37.7749, lng: -122.4194, place: 'San Francisco weekend', uid: DEMO_PERSONAS[0]!.id, seed: 't1' },
    { lat: 37.8044, lng: -122.2712, place: 'Oakland coffee crawl', uid: DEMO_PERSONAS[1]!.id, seed: 't2' },
    { lat: 37.3382, lng: -121.8863, place: 'San Jose night market', uid: DEMO_PERSONAS[2]!.id, seed: 't3' },
    { lat: 37.5485, lng: -122.059, place: 'Half Moon Bay coast', uid: DEMO_PERSONAS[3]!.id, seed: 't4' },
    { lat: 36.9741, lng: -122.0308, place: 'Santa Cruz boardwalk', uid: DEMO_PERSONAS[4]!.id, seed: 't5' },
    { lat: 38.5816, lng: -121.4944, place: 'Sacramento day trip', uid: DEMO_PERSONAS[5]!.id, seed: 't6' },
  ];
  return pairs.map((p, i) => ({
    id: `demo_travel_${i}`,
    yearbookId: yb,
    userId: p.uid,
    photoURLs: [`https://picsum.photos/seed/${p.seed}/600/400`],
    placeName: p.place,
    caption: 'Demo trip — explore the map with your crew.',
    latitude: p.lat,
    longitude: p.lng,
    taggedUserIds: [],
    createdAt: new Date(),
  }));
}

export const TUTORIAL_COLLAGE_URLS = [
  TUTORIAL_HOST.photoURL!,
  DEMO_PERSONAS[0]!.photoURL!,
  DEMO_PERSONAS[1]!.photoURL!,
  DEMO_PERSONAS[2]!.photoURL!,
];
