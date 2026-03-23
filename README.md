# Keepsy

Social yearbook app for sororities — built with Expo, React Native, and Firebase.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and add your keys:

```bash
# In .env (see .env.example):
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Optional:
EXPO_PUBLIC_OPENAI_API_KEY=   # AI yearbook cover + profile portraits (DALL·E)
```

### OpenAI / “ChatGPT” API key (optional AI images)

The app calls OpenAI’s **Images API** (DALL·E 2) from your device — not the ChatGPT website.

1. Create or log in at [platform.openai.com](https://platform.openai.com).
2. Go to **API keys** → **Create new secret key**. Copy it immediately (you won’t see it again).
3. Under **Billing**, add a payment method and buy a small credit if prompted. **ChatGPT Plus** does *not* include API usage; the API is billed separately.
4. In your project root, create `.env` (see `.env.example`) and set:
   ```bash
   EXPO_PUBLIC_OPENAI_API_KEY=sk-...
   ```
5. **Restart** the dev server (`Ctrl+C`, then `npx expo start`) so Expo picks up the new variable.

Then on **Create yearbook** you’ll see **AI cover visual**: describe the cover, tap **Generate options**, pick one, and create the yearbook. You can also regenerate the cover in **Yearbook settings**, and use AI portraits on **Edit profile**.

**AI images & Firestore:** OpenAI image links expire quickly. The app only stores **Firebase Storage download URLs** in Firestore (binary files live in **Storage**, not Firestore). **Covers:** after create or settings save, the image is downloaded and uploaded to `yearbooks/{id}/cover.jpg` before the document is updated with a stable URL. **Profile AI portraits:** choosing an option uploads to `users/{uid}/avatar.jpg` and saves that URL on the user doc. Older yearbooks that still have a raw OpenAI URL may show a placeholder until you **regenerate and save** the cover once.

> **Security note:** `EXPO_PUBLIC_*` keys are embedded in the app bundle. Fine for local development; for production builds, prefer a small backend that holds the key and proxies image requests.

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
- **`KeepsyBookLoader`** — **Lottie** book animation (`assets/lottie/book-with-turning-pages.json`), original colors; `size`, optional **`accessibilityLabel`** (no on-screen caption). Respects **Reduce Motion**.
- **`LoadingState`** — primitive loader: **`fill`** = full-window `Modal` + dim + large Lottie **only** (no visible title/message; optional `title` / `message` / `accessibilityLabel` are for screen readers only). Prefer **`DeferredFullscreenLoader`** in UI.
- **`DeferredFullscreenLoader`** — same as above after **`DEFERRED_LOADING_DELAY_MS` (500ms)**. Props: `active`, optional **`accessibilityLabel`** (VoiceOver), `delayMs`, `size`, `dimBackground`.
- **`useDeferredLoading(active, delayMs?)`** — hook if you need the delayed boolean without the overlay component.
