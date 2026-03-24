/** Solid chip styling for profile / icon-only social buttons. */
export function socialPlatformChipStyle(platformKey: string): { background: string; iconColor: string } {
  switch (platformKey) {
    case 'instagram':
      return { background: '#E4405F', iconColor: '#FFFFFF' };
    case 'twitter':
      return { background: '#000000', iconColor: '#FFFFFF' };
    case 'linkedin':
      return { background: '#0A66C2', iconColor: '#FFFFFF' };
    default:
      return { background: '#6B7280', iconColor: '#FFFFFF' };
  }
}

/**
 * Normalize user-entered social values into a safe https URL for Linking.openURL.
 */
export function resolveSocialUrl(platformKey: string, raw: string): string {
  let v = raw.trim();
  if (!v) return '';

  const lower = v.toLowerCase();
  const looksLikeUrl =
    /^https?:\/\//i.test(v) ||
    /^(www\.)?(instagram|linkedin|twitter)\.com/i.test(v) ||
    /^(www\.)?x\.com\//i.test(v);

  if (looksLikeUrl) {
    if (!/^https?:\/\//i.test(v)) {
      v = `https://${v.replace(/^\/+/, '')}`;
    } else if (v.startsWith('http://')) {
      v = `https://${v.slice(7)}`;
    }
    return v;
  }

  const handle = v.replace(/^@/, '').replace(/\/+$/, '');

  switch (platformKey) {
    case 'instagram':
      return `https://www.instagram.com/${handle}/`;
    case 'twitter':
      return `https://x.com/${handle}`;
    case 'linkedin':
      if (handle.includes('/')) {
        return `https://www.linkedin.com/${handle.replace(/^\/+/, '')}`;
      }
      return `https://www.linkedin.com/in/${handle}/`;
    default:
      return `https://${handle}`;
  }
}

/** Short label shown next to the icon (handle or trimmed URL path). */
export function socialLinkDisplayText(platformKey: string, raw: string): string {
  const v = raw.trim();
  if (!v) return '';

  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      const path = u.pathname.replace(/\/+$/, '') || u.hostname;
      const segments = path.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      if (last && last.length <= 40) {
        return last.startsWith('@') ? last : `@${last}`;
      }
      return u.hostname.replace(/^www\./, '');
    } catch {
      return v;
    }
  }

  return v.startsWith('@') ? v : `@${v}`;
}
