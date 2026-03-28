import {
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  type ConfirmationResult,
  type ApplicationVerifier,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/src/config/firebase';
import { logger } from '@/src/utils/logger';

let confirmationResult: ConfirmationResult | null = null;

export function setConfirmationResult(result: ConfirmationResult | null) {
  confirmationResult = result;
}

export async function sendPhoneCode(
  phoneNumber: string,
  appVerifier?: ApplicationVerifier
): Promise<string> {
  try {
    const auth = getFirebaseAuth();
    const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    confirmationResult = result;
    logger.info('AuthService', 'sendPhoneCode sent', { phone: phoneNumber.slice(-4) });
    return 'sent';
  } catch (e) {
    logger.error('AuthService', 'sendPhoneCode failed', e);
    throw e;
  }
}

export async function verifyCode(code: string): Promise<void> {
  if (!confirmationResult) {
    logger.error('AuthService', 'verifyCode: no confirmation in progress', undefined);
    throw new Error('No verification in progress');
  }
  try {
    await confirmationResult.confirm(code);
    confirmationResult = null;
    logger.info('AuthService', 'verifyCode success');
  } catch (e) {
    logger.error('AuthService', 'verifyCode failed', e);
    throw e;
  }
}

export async function signOut(): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    logger.info('AuthService', 'signOut success');
  } catch (e) {
    logger.error('AuthService', 'signOut failed', e);
    throw e;
  }
}
