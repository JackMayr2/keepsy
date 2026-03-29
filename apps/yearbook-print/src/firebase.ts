import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

let appCheck: AppCheck | null = null;

export function isFirebaseConfigured(): boolean {
  return !!config.apiKey.trim();
}

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(config);
  }
  return getApps()[0]!;
}

function initAppCheckIfConfigured(): void {
  if (appCheck || typeof window === 'undefined') return;

  const siteKey = (import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY ?? '').trim();
  if (!siteKey) return;

  const debugToken = (import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN ?? '').trim();
  if (import.meta.env.DEV && debugToken) {
    (
      window as Window & {
        FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean;
      }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === 'true' ? true : debugToken;
  }

  try {
    appCheck = initializeAppCheck(getFirebaseApp(), {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn('App Check initialization failed', e);
  }
}

export function getDb(): Firestore {
  initAppCheckIfConfigured();
  return getFirestore(getFirebaseApp());
}

export function getFirebaseAuth(): Auth {
  initAppCheckIfConfigured();
  return getAuth(getFirebaseApp());
}
