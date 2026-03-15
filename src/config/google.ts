const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

export function getGooglePlacesConfig() {
  return { apiKey: GOOGLE_PLACES_API_KEY };
}

export function isGooglePlacesConfigured(): boolean {
  return GOOGLE_PLACES_API_KEY.length > 0;
}
