# Keepsy Brand Theme

Keepsy now uses a shared visual language built from the references: glossy gradients, soft glass surfaces, confident typography, and playful floating color.

## Visual Direction

- **Mood:** premium, social, scrapbook-meets-afterparty
- **Core cues:** iridescent pink / violet / sky gradients, soft frosted cards, bold headlines, rounded sticker-like geometry
- **Light mode:** airy “daydream” wash with floating color blobs
- **Dark mode:** saturated “afterparty” navy/violet surfaces with neon glow

## Source Of Truth

- `src/design-system/theme/keepsy-tokens.ts`
  Color palette, gradients, logo colors, spacing, radii, typography, and elevation
- `src/theme/light.ts`
  Legacy theme bridge so older UI primitives share the same palette

## Reusable Artifacts

- `src/design-system/components/BrandBackground.tsx`
  Animated aurora background used by `Page`, `Container`, and auth screens
- `src/design-system/components/BrandLogo.tsx`
  Reusable logo lockup / mark for screens, headers, and future marketing surfaces
- `src/components/ui/Button.tsx`
  Legacy gradient/glass button treatment
- `src/components/ui/Card.tsx`
  Legacy frosted-card surface
- `src/components/ui/Input.tsx`
  Legacy glass input field
- `src/design-system/components/DSButton.tsx`
  Tamagui-aligned button styling for migrated screens
- `src/design-system/components/DSCard.tsx`
  Tamagui glass card styling
- `src/design-system/components/DSInput.tsx`
  Tamagui glass input styling

## Logo Assets

Vector sources live in `assets/brand/`:

- `keepsy-icon-source.svg`
- `keepsy-wordmark.svg`
- `keepsy-adaptive-background.svg`
- `keepsy-adaptive-foreground.svg`
- `keepsy-adaptive-monochrome.svg`

Generate app assets with:

```bash
./scripts/generate-brand-assets.sh
```

That script refreshes:

- `assets/images/icon.png`
- `assets/images/splash-icon.png`
- `assets/images/favicon.png`
- `assets/images/android-icon-background.png`
- `assets/images/android-icon-foreground.png`
- `assets/images/android-icon-monochrome.png`

## Usage Notes

- Default to `Page` or `Container` instead of flat `View` roots so the new background treatment shows up consistently.
- Use `BrandLogo` on entry screens or major empty states instead of raw text headers when you want a stronger brand moment.
- Prefer the existing button/input/card primitives rather than restyling screen-by-screen.
- Keep gradients broad and atmospheric. Reserve high-contrast solid fills for primary actions.
