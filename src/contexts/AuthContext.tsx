'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth } from '@/src/config/firebase';
import { getUser } from '@/src/services/firestore';
import { signOut as authSignOut } from '@/src/services/auth';
import { logger } from '@/src/utils/logger';

const PENDING_JOIN_KEY = 'keepsy_pending_join';
const AUTH_LOADING_TIMEOUT_MS = 5000;

export type AuthState = 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated';

type AuthContextValue = {
  authState: AuthState;
  userId: string | null;
  pendingJoinCode: string | null;
  setPendingJoinCode: (code: string | null) => void;
  signOut: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isFirebaseConfigured(): boolean {
  return !!(process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '').trim();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingJoinCode, setPendingJoinCodeState] = useState<string | null>(null);

  const setPendingJoinCode = useCallback(async (code: string | null) => {
    setPendingJoinCodeState(code);
    if (code) await AsyncStorage.setItem(PENDING_JOIN_KEY, code);
    else await AsyncStorage.removeItem(PENDING_JOIN_KEY);
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setUserId(null);
    setAuthState('unauthenticated');
  }, []);

  const refreshAuthState = useCallback(async () => {
    if (!isFirebaseConfigured()) return;
    try {
      const auth = getFirebaseAuth();
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const uid = firebaseUser.uid;
      const userDoc = await getUser(uid);
      if (userDoc) {
        setUserId(uid);
        setAuthState('authenticated');
        logger.info('Auth', 'refreshAuthState: authenticated', { uid });
      }
    } catch (e) {
      logger.error('Auth', 'refreshAuthState failed', e);
    }
  }, []);

  const resolvedRef = useRef(false);

  useEffect(() => {
    resolvedRef.current = false;
    const configured = isFirebaseConfigured();
    logger.info('Auth', 'init', { firebaseConfigured: configured });
    if (!configured) {
      logger.info('Auth', 'Firebase not configured; showing phone screen');
      setAuthState('unauthenticated');
      setUserId(null);
      resolvedRef.current = true;
      return;
    }

    let unsub: (() => void) | undefined;
    try {
      const auth = getFirebaseAuth();
      unsub = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (!firebaseUser) {
          logger.info('Auth', 'No cached user → unauthenticated (show phone)');
          setUserId(null);
          setAuthState('unauthenticated');
          resolvedRef.current = true;
          return;
        }
        const uid = firebaseUser.uid;
        logger.info('Auth', 'Cached Firebase user', { uid });
        try {
          const userDoc = await getUser(uid);
          if (!userDoc) {
            logger.info('Auth', 'No user doc → onboarding');
            setUserId(uid);
            setAuthState('onboarding');
          } else {
            logger.info('Auth', 'User doc exists → authenticated');
            setUserId(uid);
            setAuthState('authenticated');
          }
        } catch (e) {
          logger.error('Auth', 'getUser failed, sending to onboarding', e);
          setUserId(uid);
          setAuthState('onboarding');
        }
        resolvedRef.current = true;
      });
    } catch (e) {
      logger.error('Auth', 'Auth init failed (getFirebaseAuth or onAuthStateChanged); showing phone', e);
      setAuthState('unauthenticated');
      setUserId(null);
      resolvedRef.current = true;
    }

    const timeout = setTimeout(() => {
      if (!resolvedRef.current) {
        logger.warn('Auth', 'Auth loading timeout; forcing unauthenticated to show phone');
        setAuthState('unauthenticated');
        setUserId(null);
      }
    }, AUTH_LOADING_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
      unsub?.();
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(PENDING_JOIN_KEY).then((code) => {
      if (code) setPendingJoinCodeState(code);
    });
  }, []);

  const value: AuthContextValue = {
    authState,
    userId,
    pendingJoinCode,
    setPendingJoinCode,
    signOut,
    refreshAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
