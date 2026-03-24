import type { User } from '@/src/types/user.types';
import { DEMO_USER_PREFIX, TUTORIAL_HOST_USER_ID, TUTORIAL_YEARBOOK_ID } from '@/src/tutorial/constants';
import type { YearbookMember } from '@/src/types/yearbook.types';

function demoUser(
  n: number,
  first: string,
  last: string,
  bio: string,
  city: string,
  lat: number,
  lng: number
): User {
  const id = `${DEMO_USER_PREFIX}${String(n).padStart(2, '0')}`;
  return {
    id,
    firstName: first,
    lastName: last,
    email: `${first.toLowerCase()}.${n}@example.invalid`,
    bio,
    city,
    homeLatitude: lat,
    homeLongitude: lng,
    photoURL: `https://picsum.photos/seed/${encodeURIComponent(id)}/400/400`,
    createdAt: new Date(),
  };
}

/** Synthetic host shown as yearbook creator (not a real Auth account). */
export const TUTORIAL_HOST: User = {
  id: TUTORIAL_HOST_USER_ID,
  firstName: 'Alex',
  lastName: 'Kim',
  email: 'alex.kim@example.invalid',
  bio: 'Always down for game night, coffee runs, and last-minute road trips.',
  city: 'Portland, OR',
  homeLatitude: 45.5152,
  homeLongitude: -122.6784,
  photoURL: `https://picsum.photos/seed/${encodeURIComponent(TUTORIAL_HOST_USER_ID)}/400/400`,
  createdAt: new Date(),
};

/** Eighteen fictional friends — combined with host + viewer = 20 members. */
export const DEMO_PERSONAS: User[] = [
  demoUser(1, 'Jordan', 'Reyes', 'Film cameras, thrift finds, and Sunday brunch.', 'Austin, TX', 30.2672, -97.7431),
  demoUser(2, 'Sam', 'Patel', 'Runner, playlist curator, and amateur baker.', 'Chicago, IL', 41.8781, -87.6298),
  demoUser(3, 'Riley', 'Nguyen', 'Design student who sketches on every napkin.', 'Seattle, WA', 47.6062, -122.3321),
  demoUser(4, 'Casey', 'Morgan', 'Camping, vinyl, and very strong pour-over opinions.', 'Denver, CO', 39.7392, -104.9903),
  demoUser(5, 'Taylor', 'Brooks', 'Night-owl engineer. Karaoke liability.', 'San Jose, CA', 37.3382, -121.8863),
  demoUser(6, 'Morgan', 'Lee', 'Photographer for friends first, clients second.', 'Los Angeles, CA', 34.0522, -118.2437),
  demoUser(7, 'Quinn', 'Foster', 'Teacher by day, trivia ringer by night.', 'Phoenix, AZ', 33.4484, -112.074),
  demoUser(8, 'Avery', 'Diaz', 'Plant parent ×3. Will share cuttings.', 'San Diego, CA', 32.7157, -117.1611),
  demoUser(9, 'Jamie', 'Okonkwo', 'Soccer, spreadsheets, and group trips.', 'Atlanta, GA', 33.749, -84.388),
  demoUser(10, 'Cameron', 'Vega', 'Chef-in-training. Brunch reservations are my love language.', 'Miami, FL', 25.7617, -80.1918),
  demoUser(11, 'Skyler', 'Hayes', 'Climber, reader, always late to the group chat.', 'Salt Lake City, UT', 40.7608, -111.891),
  demoUser(12, 'Reese', 'Park', 'Music school grad. I bring the aux.', 'Nashville, TN', 36.1627, -86.7816),
  demoUser(13, 'Drew', 'Ali', 'Volunteer weekends, coffee weekdays.', 'Minneapolis, MN', 44.9778, -93.265),
  demoUser(14, 'Blake', 'Chen', 'Board games, hot pot, and bad puns.', 'Vancouver, BC', 49.2827, -123.1207),
  demoUser(15, 'Emery', 'Wright', 'Nurse. Will remind you to drink water.', 'Boston, MA', 42.3601, -71.0589),
  demoUser(16, 'Finley', 'Rivera', 'Skate clips, zines, and rooftop sunsets.', 'Philadelphia, PA', 39.9526, -75.1652),
  demoUser(17, 'Harper', 'Singh', 'Product designer. I prototype friendship too.', 'Toronto, ON', 43.6532, -79.3832),
  demoUser(18, 'Logan', 'Murphy', 'Dog dad. Trail maps in every backpack.', 'Portland, ME', 43.6591, -70.2568),
];

const ALL_DEMO_BY_ID: Record<string, User> = {};
for (const p of DEMO_PERSONAS) ALL_DEMO_BY_ID[p.id] = p;
ALL_DEMO_BY_ID[TUTORIAL_HOST.id] = TUTORIAL_HOST;

export function getDemoUser(userId: string): User | null {
  return ALL_DEMO_BY_ID[userId] ?? (userId === TUTORIAL_HOST_USER_ID ? TUTORIAL_HOST : null);
}

/** Resolve profile for member tab — real Firestore user or bundled demo persona. */
export async function getUserForTutorial(
  userId: string,
  fetchReal: (uid: string) => Promise<import('@/src/types/user.types').User | null>
): Promise<import('@/src/types/user.types').User | null> {
  const demo = getDemoUser(userId);
  if (demo) return demo;
  return fetchReal(userId);
}

export function tutorialMemberRowsForViewer(viewerUserId: string | undefined): YearbookMember[] {
  const yb = TUTORIAL_YEARBOOK_ID;
  const rows: YearbookMember[] = [];

  if (viewerUserId) {
    rows.push({
      id: `${yb}_${viewerUserId}`,
      yearbookId: yb,
      userId: viewerUserId,
      role: 'member',
      joinedAt: new Date(),
    });
  }

  rows.push({
    id: `${yb}_${TUTORIAL_HOST_USER_ID}`,
    yearbookId: yb,
    userId: TUTORIAL_HOST_USER_ID,
    role: 'creator',
    joinedAt: new Date(),
  });

  for (const p of DEMO_PERSONAS) {
    rows.push({
      id: `${yb}_${p.id}`,
      yearbookId: yb,
      userId: p.id,
      role: 'member',
      joinedAt: new Date(),
    });
  }

  return rows;
}

export type MemberWithTutorialUser = YearbookMember & { user: User | null };

export async function loadTutorialMembersWithUsers(
  viewerUserId: string | undefined,
  fetchReal: (uid: string) => Promise<User | null>
): Promise<MemberWithTutorialUser[]> {
  const members = tutorialMemberRowsForViewer(viewerUserId);
  const out: MemberWithTutorialUser[] = [];
  for (const m of members) {
    const user = await getUserForTutorial(m.userId, fetchReal);
    out.push({ ...m, user });
  }
  return out;
}
