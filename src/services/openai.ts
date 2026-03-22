import { getOpenAIConfig, isOpenAIConfigured } from '@/src/config/openai';
import { logger } from '@/src/utils/logger';

async function generateDalleImages(prompt: string, count: number = 4): Promise<string[]> {
  if (!isOpenAIConfigured()) {
    return [];
  }
  const { apiKey } = getOpenAIConfig();
  const urls: string[] = [];
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-2',
      prompt: prompt.slice(0, 1000),
      n: count,
      size: '1024x1024',
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg =
      (err as { error?: { message?: string } })?.error?.message ?? response.statusText ?? 'Image generation failed';
    logger.error('OpenAI', 'generateDalleImages failed', { status: response.status, message: msg });
    throw new Error(msg);
  }
  const data = (await response.json()) as { data?: Array<{ url?: string }> };
  for (const item of data.data ?? []) {
    if (item.url) urls.push(item.url);
  }
  return urls;
}

export async function generateYearbookVisualOptions(prompt: string, count: number = 4): Promise<string[]> {
  const styled = `Bold, polished yearbook or memory-book cover illustration, eye-catching composition, suitable as a digital yearbook hero image, no small illegible text unless the user explicitly asked for specific words: ${prompt}`.slice(
    0,
    1000
  );
  return generateDalleImages(styled, count);
}

/**
 * Yearbook-style profile portraits (shown on member profiles / avatars).
 */
export async function generateProfileAvatarOptions(userPrompt: string, count: number = 4): Promise<string[]> {
  const styled = `Professional yearbook profile portrait photograph, head and shoulders, natural friendly expression, soft even lighting, clean simple or softly blurred background, single person, realistic, suitable as a yearbook photo: ${userPrompt}`.slice(
    0,
    1000
  );
  return generateDalleImages(styled, count);
}
