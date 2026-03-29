import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import firebaseCompat from 'firebase/compat/app';
import 'firebase/compat/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey ?? '').trim();
}

/**
 * expo-firebase-recaptcha on web uses `firebase/compat/auth`. The modular `initializeApp` does not
 * always register `[DEFAULT]` for compat before the recaptcha modal mounts, so we mirror the app here.
 */
function ensureCompatDefaultApp(): void {
  if (firebaseCompat.apps.length > 0) return;
  if (getApps().length === 0) return;
  try {
    firebaseCompat.initializeApp(getApp().options);
  } catch {
    /* already initialized or bridged */
  }
}

function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
  }
  ensureCompatDefaultApp();
  return getApp();
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

export function getFirebase() {
  if (!app) app = getFirebaseApp();
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const appInstance = getFirebase();
    if (Platform.OS === 'web') {
      auth = getAuth(appInstance);
    } else {
      try {
        auth = initializeAuth(appInstance, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch (e: unknown) {
        const code =
          typeof e === 'object' && e !== null && 'code' in e
            ? String((e as { code: unknown }).code)
            : '';
        if (code === 'auth/already-initialized') {
          auth = getAuth(appInstance);
        } else {
          throw e;
        }
      }
    }
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) db = getFirestore(getFirebase());
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) storage = getStorage(getFirebase());
  return storage;
}

if (isFirebaseConfigured()) {
  try {
    getFirebaseApp();
  } catch {
    /* invalid or incomplete env */
  }
}
