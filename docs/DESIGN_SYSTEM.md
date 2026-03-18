# Keepsy Design System

**Stack:** Tamagui (primary), React Native Reanimated (motion), Expo Haptics (feedback). Partiful-inspired: playful, premium, social, soft, pastel-forward.

---

## Token source of truth

- **`src/design-system/theme/keepsy-tokens.ts`** — Semantic color palette (background, surface, text, brand, border, semantic, pastel), spacing, size, radius, typography, shadows. Light and dark palettes.
- **`src/design-system/theme/tamagui.config.ts`** — Tamagui config: extends default config and injects **light** and **dark** themes built from `keepsy-tokens`, so `$background`, `$color`, `$borderColor`, etc. resolve to Keepsy colors.
- **`src/theme/light.ts`** and **`src/theme/tokens.ts`** — Legacy theme consumed by `useTheme()`; they import from `keepsy-tokens` so one source drives both Tamagui and legacy UI.

---

## 1. Styling Audit (reference)

### Issues

| Area | Problem |
|------|--------|
| **Theme** | Custom `ThemeContext` + plain tokens in `/src/theme`; no design-token layer that components consistently consume. |
| **Components** | UI primitives (`Button`, `Text`, `Input`, `Card`, `Container`) use `useTheme()` and manual style objects; lots of repeated layout (e.g. `styles.centered`, `marginBottom: 24`). |
| **Screens** | Mix of `StyleSheet.create`, inline objects, and component props; spacing/typography not derived from a single source. |
| **Motion** | Reanimated present but rarely used; no shared transitions or micro-interactions. |
| **Haptics** | Not used; taps feel flat. |
| **Consistency** | Radii, shadows, and spacing vary by screen; no single “premium” voice. |
| **Maintainability** | Changing colors or spacing requires edits across many files. |

### What’s Good

- Clear light/dark colors and token files (`tokens.ts`, `light.ts`).
- Reusable `Button` variants and `Text` variants.
- Safe area and auth flow already structured.

---

## 2. Proposed Theme / Design System Structure

```
src/
  design-system/
    theme/
      tokens.ts          # Design tokens (exported for reference)
      tamagui.config.ts  # Tamagui config + theme tokens
    components/
      Page.tsx
      Header.tsx
      Button.tsx
      Text.tsx
      Card.tsx
      Input.tsx
      Tag.tsx
      ListRow.tsx
    hooks/
      useHaptic.ts
    index.ts             # Public API
```

- **Single source of truth:** Tamagui config holds colors, spacing, radii, typography, shadows. All primitives use Tamagui tokens (e.g. `$background`, `$padding`, `$radiusMd`).
- **Layout:** Use Tamagui layout props (`flex`, `gap`, `padding`) everywhere; no NativeWind in v1 to avoid tooling clashes with Expo 55. NativeWind can be added later for one-off layout utilities if needed.
- **Motion:** Reanimated used in design-system components (e.g. Button press, list stagger) and in shared layout/transition patterns.
- **Haptics:** Central `useHaptic()` hook; used in Button, ListRow, and key actions.

---

## 3. How to Update the Design System Globally

| Change | Where to edit |
|--------|----------------|
| **Colors** | `design-system/theme/tamagui.config.ts` → `tokens.color` / theme `light` and `dark`. |
| **Spacing** | Same file → `tokens.space` and `size`; then use `$space.md`, `$size.4`, etc. |
| **Typography** | Same file → `tokens.fontSize`, `fontFamily`, `fontWeight`; map to `heading`, `body`, `caption` in themes. |
| **Border radius** | Same file → `tokens.radius`; use `$radius.md`, `$radius.pill`, etc. |
| **Shadows** | Same file → `tokens.shadow`; reference as `$shadow.sm`, etc. |
| **Density** | Increase/decrease `space` and `size` in one place; all screens using tokens update. |

After editing tokens/config, run the app and optionally Tamagui compiler if enabled. No need to touch individual screens for token-only changes.

---

## 4. Implemented Pieces

- **`src/design-system/theme/tamagui.config.ts`** – Tamagui config (extends `@tamagui/config`). Edit here to add custom tokens or themes.
- **`src/design-system/components/`** – Page, Header, DSButton, DSText, DSCard, DSInput, DSTag, ListRow, **EmptyState**, **Skeleton** / **SkeletonBlock**. All use Tamagui tokens (`$color`, `$background`, etc.). Cards use soft elevation; buttons use Reanimated press scale + haptics; inputs are spacious with 14px radius.
- **`src/design-system/hooks/useHaptic.ts`** – Central haptic helpers; used in DSButton and ListRow.
- **`app/(app)/(tabs)/index.tsx`** – Refactored to use Page, Header, DSButton, DSText and Tamagui layout (YStack, XStack).
- **Root layout** – Wraps app with `TamaguiProvider`; `defaultTheme` is driven by existing `ThemeProvider` (light/dark).

Other screens can be migrated the same way: replace `Container` with `Page`, old `Button`/`Text` with `DSButton`/`DSText`, and use `YStack`/`XStack` for layout with `$` token props.
