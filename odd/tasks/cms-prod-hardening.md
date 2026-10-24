# cms-prod-hardening

## Objective
Make the Keystatic-based CMS safe and complete for production, so the editors
(max 3 GitHub users) can manage the site logo, favicon, header background, ad
banners and news without code changes.

## Context
- `main` = `d9cd0f6` already routes `/admin` to `/keystatic` but predates the
  GitHub OAuth `redirect_uri` fix (`3890d53`). Production is therefore pointed
  at a CMS whose GitHub login cannot complete.
- The fix and the settings/ads singletons live on `feat/cms-site-settings-ads`
  (`c0c4d9d`), unmerged.

## Tasks
- [x] T1 Add `favicon` image field to the `siteSettings` singleton
      (`keystatic.config.ts`)
- [x] T2 Read `favicon` and add it to the `SiteSettings` type
      (`src/lib/site-settings.ts`)
- [x] T3 Wire the favicon into `Layout.astro` (`link rel="icon"` plus the two
      JSON-LD logo references) with `/favicon.svg` as fallback
- [x] T4 Create the missing `src/content/settings/site.yaml` and `ads.yaml`
- [x] T5 Retire the unauthenticated `/api/admin/{publish,upload,delete}`
      endpoints (410 Gone) and remove the hardcoded Cloudflare R2 credentials
      from source
- [x] T6 Make the session cookie `httpOnly` in `/api/auth/exchange`
- [x] T7 `astro build` passes
- [x] T8 Merge `feat/cms-site-settings-ads` into `main` and deploy
- [x] T9 Verify `/keystatic` login and the four content flows in production with
      a real editor account (Guillo / @guillosthormes-arch)
- [ ] T10 Rotate the Cloudflare R2 access key — OWNER ACTION: the key was
      committed in source and stays valid until rotated

## Acceptance
- `/keystatic` shows "Ajustes del sitio" (logo, favicon, header background,
  opacity) and "Anuncios".
- With empty settings the site renders exactly as before (`/favicon.svg`
  fallback, no header background, static ad banner).
- An editor who is a repo collaborator can log in and save.
- No production route accepts an unvalidated `entretormentas_session` cookie to
  publish, delete or upload.

## Resolution & Root Cause: GitHub App 404
- **Problem**: When collaborator `@guillosthormes-arch` attempted to log in at `/keystatic`, clicking *"Log in with GitHub"* redirected to `github.com/login/oauth/authorize?client_id=Iv23liBa34PLLoRkcae3` which yielded a 404 "This is not the web page you are looking for".
- **Root Cause**: The GitHub App `entre-tormentas-cms` was configured with visibility **"Only on this account" (Private)** under `@moshequantum`. GitHub blocks any user other than the app owner from authorizing private apps, rendering a 404 response on the OAuth authorize endpoint.
- **Fix**: Changed the GitHub App visibility to **"Any account" (Public)** in GitHub App Settings (`https://github.com/settings/apps/entre-tormentas-cms/advanced`). Collaborators can now complete OAuth authorization and access the CMS dashboard.

## Deviations
The three `/api/admin/*` endpoints were retired rather than repaired: they had
no callers left after `/admin` was redirected to Keystatic, and the InsForge SDK
does not expose a server-side token verification call I could exercise in this
session. Repairing them with an untested auth check would have been worse than
closing them. Full implementations remain in git history.
