import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { getFirebaseAuth } from '../firebase';
import {
  DIAL_PRESETS,
  buildE164,
  firebasePhoneErrorMessage,
  formatUsNationalDisplay,
  digitsOnly,
  type DialPreset,
} from '../utils/phone';
import { maskApiKey, probeIdentityToolkitApiKey } from '../utils/identityToolkitProbe';

type Props = {
  onSignedIn: () => void;
};

function parseFirebaseCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code: string }).code);
  }
  return '';
}

function parseFirebaseServerDetail(err: unknown): string {
  if (!err || typeof err !== 'object' || !('customData' in err)) return '';
  const customData = (
    err as {
      customData?: {
        _serverResponse?: unknown;
        _tokenResponse?: unknown;
        message?: string;
      };
    }
  ).customData;
  const raw = customData?._serverResponse;
  if (!raw) return '';
  try {
    const asObject =
      typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>);
    const nestedError = (asObject.error as { message?: string } | undefined)?.message;
    const topMessage = typeof asObject.message === 'string' ? asObject.message : '';
    const tokenResponse = customData?._tokenResponse;
    const tokenError =
      tokenResponse && typeof tokenResponse === 'object'
        ? (tokenResponse as { error?: { message?: string }; errorMessage?: string }).error?.message ??
          (tokenResponse as { error?: { message?: string }; errorMessage?: string }).errorMessage
        : '';
    return nestedError || tokenError || topMessage || String(raw);
  } catch {
    const tokenResponse = customData?._tokenResponse;
    if (typeof raw === 'string' && raw.trim()) return raw;
    if (tokenResponse && typeof tokenResponse === 'object') {
      const tokenError =
        (tokenResponse as { error?: { message?: string }; errorMessage?: string }).error?.message ??
        (tokenResponse as { error?: { message?: string }; errorMessage?: string }).errorMessage;
      if (tokenError) return tokenError;
    }
    return customData?.message ?? '';
  }
}

/** Invisible reCAPTCHA often yields invalid-app-credential on localhost; visible is more reliable. */
function shouldUseVisibleRecaptcha(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return (
    import.meta.env.DEV || h === 'localhost' || h === '127.0.0.1' || h === '[::1]'
  );
}

export function PhoneSignIn({ onSignedIn }: Props) {
  const [preset, setPreset] = useState<DialPreset>(DIAL_PRESETS[0]!);
  const [national, setNational] = useState('');
  const [customFull, setCustomFull] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captchaSolved, setCaptchaSolved] = useState(() => !shouldUseVisibleRecaptcha());
  const [debugDetail, setDebugDetail] = useState<string | null>(null);
  const [apiProbe, setApiProbe] = useState<string | null>(null);
  const [apiProbing, setApiProbing] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const recaptchaMountRef = useRef<HTMLDivElement>(null);

  const destroyVerifier = useCallback(() => {
    try {
      verifierRef.current?.clear();
    } catch {
      /* widget may already be torn down */
    }
    verifierRef.current = null;
    widgetIdRef.current = null;
    setCaptchaSolved(!shouldUseVisibleRecaptcha());
  }, []);

  useEffect(() => () => destroyVerifier(), [destroyVerifier]);

  const ensureVerifier = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (verifierRef.current) return verifierRef.current;
    const mount = recaptchaMountRef.current;
    if (!mount) {
      throw new Error('Internal error: reCAPTCHA mount missing. Refresh the page.');
    }
    const visible = shouldUseVisibleRecaptcha();
    const verifier = new RecaptchaVerifier(auth, mount, {
      size: visible ? 'normal' : 'invisible',
      callback: () => {
        setCaptchaSolved(true);
      },
      'expired-callback': () => {
        setCaptchaSolved(false);
        setError('reCAPTCHA expired. Complete it again, then send the code.');
      },
    });
    widgetIdRef.current = await verifier.render();
    if (visible) setCaptchaSolved(false);
    verifierRef.current = verifier;
    return verifier;
  }, []);

  const onNationalChange = (raw: string) => {
    if (preset.id === 'custom') return;
    const d = digitsOnly(raw);
    const cap =
      preset.id === 'uk' ? 11 : preset.nationalLen > 0 ? preset.nationalLen : 15;
    setNational(d.slice(0, cap));
  };

  const e164Preview = buildE164(
    preset,
    national,
    customFull
  );

  const sendCode = async () => {
    setError(null);
    setDebugDetail(null);
    const e164 = buildE164(preset, national, customFull);
    if (!e164) {
      setError(
        preset.id === 'custom'
          ? 'Enter a full international number starting with + (e.g. +44 7911 123456).'
          : `Enter a valid ${preset.label} mobile number (${preset.nationalLen} digits).`
      );
      return;
    }
    if (visibleRecaptcha && !captchaSolved) {
      setError('Complete the reCAPTCHA above first, then send the code.');
      return;
    }

    setBusy(true);

    try {
      await new Promise((r) => requestAnimationFrame(r));
      const verifier = await ensureVerifier();
      const auth = getFirebaseAuth();
      confirmationRef.current = await signInWithPhoneNumber(auth, e164, verifier);
      setStep('code');
    } catch (e) {
      const c = parseFirebaseCode(e);
      const serverDetail = parseFirebaseServerDetail(e);
      const hint = firebasePhoneErrorMessage(c);
      const base = e instanceof Error ? e.message : 'Could not send verification code';
      setError(hint || base);
      if (c === 'auth/invalid-app-credential' || c === 'auth/captcha-check-failed') {
        destroyVerifier();
      }
      if (import.meta.env.DEV) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '(unknown origin)';
        setDebugDetail(
          [
            `origin: ${origin}`,
            `code: ${c || '(no firebase code)'}`,
            serverDetail ? `server: ${serverDetail}` : null,
          ]
            .filter(Boolean)
            .join('\n')
        );
        console.error('sendVerificationCode failed', e);
      }
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    setBusy(true);
    try {
      const conf = confirmationRef.current;
      if (!conf) {
        setError('Request a new code first.');
        return;
      }
      await conf.confirm(code.trim().replace(/\D/g, ''));
      onSignedIn();
    } catch (e) {
      const c = parseFirebaseCode(e);
      setError(firebasePhoneErrorMessage(c) || (e instanceof Error ? e.message : 'Invalid code'));
    } finally {
      setBusy(false);
    }
  };

  const nationalDisplay =
    preset.id === 'us' ? formatUsNationalDisplay(national) : national;

  const visibleRecaptcha = shouldUseVisibleRecaptcha();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (!visibleRecaptcha || step !== 'phone') return;
    void ensureVerifier().catch((e) => {
      if (import.meta.env.DEV) {
        console.error('reCAPTCHA init failed', e);
      }
      setError('Could not load reCAPTCHA. Disable content blockers and refresh.');
    });
  }, [ensureVerifier, step, visibleRecaptcha]);

  return (
    <div className="auth-card">
      <div className="auth-card__accent" aria-hidden />
      <div className="auth-card__body">
        <h2 className="auth-card__title">Sign in with phone</h2>
        <p className="auth-lede">
          Use the <strong>same mobile number</strong> as in the Keepsy app. We’ll text you a one-time
          code.
        </p>

        {step === 'phone' ? (
          <>
            <label className="field-label" htmlFor="country">
              Country / region
            </label>
            <select
              id="country"
              className="field-select"
              value={preset.id}
              onChange={(e) => {
                const p = DIAL_PRESETS.find((x) => x.id === e.target.value) ?? DIAL_PRESETS[0]!;
                setPreset(p);
                setNational('');
                setError(null);
              }}
            >
              {DIAL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

            {preset.id === 'custom' ? (
              <>
                <label className="field-label" htmlFor="phone-full">
                  Mobile number (E.164)
                </label>
                <input
                  id="phone-full"
                  type="tel"
                  className="field-input field-input--mono"
                  autoComplete="tel"
                  placeholder="+1 415 555 2671"
                  value={customFull}
                  onChange={(e) => setCustomFull(e.target.value)}
                />
                <p className="field-hint">Include country code with +. Spaces are optional.</p>
              </>
            ) : (
              <>
                <label className="field-label" htmlFor="phone-national">
                  Mobile number
                </label>
                <div className="phone-row">
                  <span className="phone-row__dial" aria-hidden>
                    {preset.dial}
                  </span>
                  <input
                    id="phone-national"
                    type="tel"
                    className="field-input phone-row__input"
                    autoComplete="tel-national"
                    placeholder={preset.id === 'us' ? '(555) 123-4567' : 'National number'}
                    value={nationalDisplay}
                    onChange={(e) => onNationalChange(e.target.value)}
                  />
                </div>
                {e164Preview ? (
                  <p className="field-hint">
                    Will send code to: <code className="e164-preview">{e164Preview}</code>
                  </p>
                ) : null}
              </>
            )}

            <div
              ref={recaptchaMountRef}
              className={visibleRecaptcha ? 'recaptcha-widget' : 'recaptcha-widget recaptcha-widget--hidden'}
              aria-hidden={!visibleRecaptcha}
            />
            {visibleRecaptcha ? (
              <p className="field-hint">
                Complete the reCAPTCHA above, then send the code.
                {!captchaSolved ? ' (waiting for completion)' : ''}
              </p>
            ) : null}

            {error ? <div className="callout callout--error">{error}</div> : null}
            {import.meta.env.DEV && debugDetail ? <pre className="api-probe__out">{debugDetail}</pre> : null}

            <details className="troubleshoot">
              <summary>Still seeing “invalid app credential”?</summary>
              <ul>
                <li>
                  If <code>localhost</code> is already under Firebase → Authentication → Authorized
                  domains, the problem is almost always the <strong>Google Cloud browser API key</strong>{' '}
                  (must match <code>VITE_FIREBASE_API_KEY</code>). Open it from Firebase → Project
                  settings → General → Your apps → Web → <em>or</em> Google Cloud → Credentials.
                </li>
                <li>
                  <strong>HTTP referrer</strong> patterns are picky: add{' '}
                  <code>{currentOrigin ? `${currentOrigin}/*` : 'http://localhost:5174/*'}</code>,{' '}
                  <code>http://localhost:5174/*</code>, <code>http://127.0.0.1:5174/*</code>,{' '}
                  <code>http://localhost/*</code>, and <code>http://127.0.0.1/*</code> (trailing{' '}
                  <code>/*</code>). Or set Application restrictions to <strong>None</strong> to confirm
                  the key is the issue.
                </li>
                <li>
                  Browser privacy/ad-block extensions can block reCAPTCHA and produce this exact error.
                  Try in a clean Chrome profile (no extensions) or an Incognito window with extensions
                  disabled.
                </li>
                <li>
                  <strong>API restrictions</strong>: <strong>Don&apos;t restrict</strong> for a quick
                  test, or allow <strong>Identity Toolkit API</strong>.
                </li>
                <li>
                  Firebase → <strong>App Check</strong>: if <strong>Authentication</strong> is enforced for
                  Web without a working web provider, phone auth can fail. For local dev, disable
                  enforcement for Auth or use a debug token per Firebase docs.
                </li>
                <li>
                  Firebase → Authentication → Sign-in method: <strong>Phone</strong> enabled.
                </li>
              </ul>
              {import.meta.env.DEV ? (
                <div className="api-probe">
                  <p className="field-hint" style={{ marginBottom: '0.5rem' }}>
                    Dev: loaded API key <code>{maskApiKey(import.meta.env.VITE_FIREBASE_API_KEY ?? '')}</code>
                  </p>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={apiProbing}
                    onClick={async () => {
                      setApiProbing(true);
                      setApiProbe(null);
                      try {
                        const msg = await probeIdentityToolkitApiKey(
                          import.meta.env.VITE_FIREBASE_API_KEY ?? ''
                        );
                        setApiProbe(msg);
                      } finally {
                        setApiProbing(false);
                      }
                    }}
                  >
                    {apiProbing ? 'Checking…' : 'Run Identity Toolkit API key check'}
                  </button>
                  {apiProbe ? <pre className="api-probe__out">{apiProbe}</pre> : null}
                </div>
              ) : null}
            </details>

            <button
              type="button"
              className="btn btn--primary btn--block"
              disabled={busy || (visibleRecaptcha && !captchaSolved)}
              onClick={sendCode}
            >
              {busy ? 'Sending…' : 'Send verification code'}
            </button>
          </>
        ) : (
          <>
            <label className="field-label" htmlFor="otp">
              6-digit code
            </label>
            <input
              id="otp"
              inputMode="numeric"
              className="field-input field-input--otp"
              autoComplete="one-time-code"
              placeholder="••••••"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            {error ? <div className="callout callout--error">{error}</div> : null}
            <div className="btn-row">
              <button type="button" className="btn btn--primary" disabled={busy || code.length < 6} onClick={verifyCode}>
                {busy ? 'Checking…' : 'Verify & sign in'}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={busy}
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  confirmationRef.current = null;
                  setError(null);
                  destroyVerifier();
                }}
              >
                Different number
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
