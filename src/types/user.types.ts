export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  photoURL?: string;
  city?: string;
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
  city?: string;
  birthday?: string;
  socialLinks?: Record<string, string>;
}
