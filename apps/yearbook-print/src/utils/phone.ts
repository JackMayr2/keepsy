/** Strip to digits for national-number entry (no country prefix). */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/** Visual format for US/CA 10-digit national numbers. */
export function formatUsNationalDisplay(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export type DialPreset = {
  id: string;
  dial: string;
  label: string;
  /** Expected national digit length; 0 = use custom full input */
  nationalLen: number;
};

export const DIAL_PRESETS: DialPreset[] = [
  { id: 'us', dial: '+1', label: 'United States / Canada', nationalLen: 10 },
  { id: 'uk', dial: '+44', label: 'United Kingdom', nationalLen: 10 },
  { id: 'au', dial: '+61', label: 'Australia', nationalLen: 9 },
  { id: 'in', dial: '+91', label: 'India', nationalLen: 10 },
  { id: 'custom', dial: '', label: 'Other — full number', nationalLen: 0 },
];

/**
 * Build E.164 for Firebase Phone Auth.
 * - Preset: dial + national digits only (no leading 0).
 * - Custom: user must paste/type full E.164 including +.
 */
export function buildE164(preset: DialPreset, nationalDigits: string, customFull: string): string | null {
  if (preset.id === 'custom') {
    const t = customFull.trim().replace(/\s/g, '');
    if (!t.startsWith('+')) return null;
    const rest = t.slice(1).replace(/\D/g, '');
    if (rest.length < 8 || rest.length > 15) return null;
    return `+${rest}`;
  }
  let n = digitsOnly(nationalDigits);
  if (preset.id === 'uk' && n.startsWith('0')) {
    n = n.slice(1);
  }
  if (preset.nationalLen > 0 && n.length !== preset.nationalLen) return null;
  const d = preset.dial.replace(/\D/g, '');
  return `+${d}${n}`;
}

export function firebasePhoneErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-app-credential':
      return 'Invalid app credential — usually Google Cloud browser API key restrictions (add http://localhost:5174/* referrers or None), API restrictions (allow Identity Toolkit), or Firebase App Check enforcing Auth on web. In dev, open “Still seeing invalid app credential?” and run the API key check.';
    case 'auth/invalid-phone-number':
      return 'That phone number doesn’t look valid. Check country and digit count.';
    case 'auth/missing-phone-number':
      return 'Enter a phone number.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA check failed. Refresh the page and try again.';
    case 'auth/quota-exceeded':
      return 'Phone verification quota exceeded for this project.';
    case 'auth/invalid-verification-code':
      return 'That code didn’t match. Request a new code or check for typos.';
    default:
      return '';
  }
}
