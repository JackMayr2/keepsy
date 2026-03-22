export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  photoURL?: string;
  /** Display label from place search (e.g. city) */
  city?: string | null;
  /** Geocoded home location for maps when set from autocomplete */
  homeLatitude?: number | null;
  homeLongitude?: number | null;
  birthday?: string;
  socialLinks?: Record<string, string>;
  createdAt: Date | { seconds: number; nanoseconds: number };
}

export interface UserCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  photoURL?: string;
  city?: string | null;
  homeLatitude?: number | null;
  homeLongitude?: number | null;
  birthday?: string;
  socialLinks?: Record<string, string>;
}
