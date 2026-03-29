/**
 * Lightweight check: can this browser use your Web API key with Identity Toolkit?
 * Uses the public recaptchaParams endpoint (same service as phone auth).
 */
export async function probeIdentityToolkitApiKey(apiKey: string): Promise<string> {
  const trimmed = apiKey.trim();
  if (!trimmed) return 'VITE_FIREBASE_API_KEY is empty — check apps/yearbook-print/.env and restart Vite.';

  const url = `https://identitytoolkit.googleapis.com/v1/recaptchaParams?key=${encodeURIComponent(trimmed)}`;
  try {
    const r = await fetch(url);
    const text = await r.text();
    if (r.ok) {
      return (
        'OK: Identity Toolkit accepted this API key from your browser. ' +
        'If phone sign-in still fails with invalid-app-credential, open Firebase → App Check and ensure ' +
        'Authentication is not enforced for web without a registered App Check provider, or temporarily turn enforcement off for dev.'
      );
    }
    let detail = text.slice(0, 400);
    try {
      const j = JSON.parse(text) as { error?: { message?: string; status?: string } };
      if (j.error?.message) detail = j.error.message;
    } catch {
      /* keep raw */
    }
    return (
      `Identity Toolkit returned HTTP ${r.status}: ${detail}\n\n` +
      `Common fixes:\n` +
      `• Google Cloud → Credentials → this API key → Application restrictions: set to None (test), or HTTP referrers including http://localhost:5174/* and http://127.0.0.1:5174/*\n` +
      `• API restrictions: None, or allow “Identity Toolkit API”\n` +
      `• Confirm this key matches Firebase → Project settings → Your apps → Web app config`
    );
  } catch (e) {
    return `Network/CORS error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export function maskApiKey(key: string): string {
  const t = key.trim();
  if (t.length <= 12) return '(too short to mask)';
  return `${t.slice(0, 8)}…${t.slice(-4)}`;
}
