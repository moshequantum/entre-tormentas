# cms-site-settings-ads

## Objective
Let editors (max 3 GitHub users) manage the site logo, header background image and ad banners from Keystatic, without code changes. UI components stay developer-owned; a visual redesign follows next week.

## Scope
- Keystatic singletons: `siteSettings` (logo, header background, opacity) and `ads` (list of placements).
- Images stored in the repo (`public/images/site`, `public/images/ads`).
- Header and AdBanner read from the singletons and fall back to current hardcoded behavior when empty.

## Out of scope
Redesign / look & feel, R2 migration, client-side date filtering of expired ads.

## Constraints
- Fields defined by meaning, not by current look, so the redesign reuses them.
- Artifacts (code, labels) in English except editor-facing Keystatic labels, which follow the existing Spanish labels.

## Tasks
- [x] T1 Singletons in `keystatic.config.ts` + typed reader helper
- [x] T2 Header reads logo and background from siteSettings (fallback: current SVG, no background)
- [x] T3 AdBanner/pages read active ads by placement (fallback: current hardcoded banner)
- [ ] T4 Build passes; manual check of /keystatic

## Acceptance
- `/keystatic` shows "Ajustes del sitio" and "Anuncios".
- With empty settings the site renders exactly as before.
- Ads outside their start/end dates or disabled are not rendered.

## Progress
Branch: feat/cms-site-settings-ads. Route: delegated direct (one writer, 2+ non-trivial files).
