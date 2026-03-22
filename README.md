# Keepsy

Social yearbook app for sororities — built with Expo, React Native, and Firebase.

## Setup

1. Install dependencies: `npm install`
2. Copy env example and add your keys:

```bash
# Create .env or set in app.config.js extra:
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Optional:
EXPO_PUBLIC_OPENAI_API_KEY=   # AI yearbook cover + profile portraits (DALL·E)
```

City / place search uses [Photon](https://photon.komoot.io) (OpenStreetMap data); no API key required.

3. Run: `npx expo start`

## Deep links

- `yearbook://join/CODE` — Join a yearbook by 8-character invite code. If the user isn’t signed in, the code is stored and applied after auth.

## Features

- Phone auth (Firebase), onboarding, profile
- Yearbooks: create, join by code, leave
- Prompts (text/photo), drafts, submissions
- Polls (vote then see results), superlatives
- Travels (photos, map pins, place search autocomplete)
- Profile home city with autocomplete; member home pins on the yearbook map
- Optional AI images (OpenAI): yearbook cover (create + settings), yearbook-style profile portraits (edit profile)
- Calendar due date picker on create / yearbook settings (defaults to ~1 month out on create)
- Yearbook settings (description, due date, cover image, invite code)
