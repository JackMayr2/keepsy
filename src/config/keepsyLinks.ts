/**
 * Public touchpoints for Keepsy — update handles and domains here.
 */
export const KEEPSY_LINKS = {
  instagram: 'https://www.instagram.com/keepsy',
  twitter: 'https://x.com/keepsy',
  website: 'https://keepsy.app',
  /** Page with App Store / Play Store links (or your marketing site). Override with EXPO_PUBLIC_APP_DOWNLOAD_URL. */
  downloadPage: 'https://keepsy.app',
  feedbackEmail: 'hello@keepsy.app',
  supportEmail: 'support@keepsy.app',
} as const;

/** Must match `app/_layout.tsx` DeepLinkHandler (`yearbook://join/{code}`). */
export const KEEPSY_URL_SCHEME = 'yearbook' as const;

/**
 * Opens the app on the join flow when tapped on-device (same scheme as in app.config / Expo).
 */
export function getYearbookJoinDeepLink(inviteCode: string): string {
  const code = inviteCode.trim();
  return `${KEEPSY_URL_SCHEME}://join/${encodeURIComponent(code)}`;
}

/**
 * HTTPS link for people who do not have the app yet (SMS, email, web).
 * Set EXPO_PUBLIC_APP_DOWNLOAD_URL to your install / smart-link page.
 */
export function getAppDownloadUrl(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_APP_DOWNLOAD_URL ?? '').trim();
  return fromEnv || KEEPSY_LINKS.downloadPage;
}

/**
 * Copy for native Share (yearbook invite). Includes deep link + download fallback.
 */
export function buildYearbookInviteShareMessage(yearbookName: string, inviteCode: string): string {
  const name = yearbookName.trim() || 'our yearbook';
  const code = inviteCode.trim();
  const deepLink = getYearbookJoinDeepLink(code);
  const getApp = getAppDownloadUrl();
  return [
    `Join "${name}" on Keepsy!`,
    `Invite code: ${code}`,
    `Open in Keepsy: ${deepLink}`,
    `Need the app? ${getApp}`,
  ].join('\n');
}

/** Values for `src/templates/email/*` group sends (use with `fillEmailTemplate`). */
export function buildYearbookGroupEmailPlaceholders(input: {
  yearbookName: string;
  inviteCode: string;
  inviterName: string;
  recipientName: string;
}): Record<string, string> {
  const code = input.inviteCode.trim();
  return {
    YEARBOOK_NAME: input.yearbookName.trim() || 'our yearbook',
    INVITE_CODE: code,
    INVITER_NAME: input.inviterName.trim() || 'Someone',
    RECIPIENT_NAME: input.recipientName.trim() || 'there',
    YEARBOOK_JOIN_LINK: getYearbookJoinDeepLink(code),
    APP_DOWNLOAD_URL: getAppDownloadUrl(),
  };
}

export function mailtoThoughtsAndIdeas(): string {
  const subject = encodeURIComponent('Keepsy — thoughts & ideas');
  const body = encodeURIComponent('Hi Keepsy team,\n\n');
  return `mailto:${KEEPSY_LINKS.feedbackEmail}?subject=${subject}&body=${body}`;
}

export function mailtoSupport(): string {
  const subject = encodeURIComponent('Keepsy — help');
  const body = encodeURIComponent('Hi Keepsy team,\n\n');
  return `mailto:${KEEPSY_LINKS.supportEmail}?subject=${subject}&body=${body}`;
}
