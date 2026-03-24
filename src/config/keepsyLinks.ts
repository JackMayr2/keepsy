/**
 * Public touchpoints for Keepsy — update handles and domains here.
 */
export const KEEPSY_LINKS = {
  instagram: 'https://www.instagram.com/keepsy',
  twitter: 'https://x.com/keepsy',
  website: 'https://keepsy.app',
  feedbackEmail: 'hello@keepsy.app',
  supportEmail: 'support@keepsy.app',
} as const;

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
