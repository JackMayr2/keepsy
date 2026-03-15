const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

export function getOpenAIConfig() {
  return { apiKey: OPENAI_API_KEY };
}

export function isOpenAIConfigured(): boolean {
  return OPENAI_API_KEY.length > 0;
}
