# AGENTS.md

## Stack (desde 2026-11-06)

- **Frontend**: Astro 5, salida 100 % estática (`output: 'static'`), Tailwind 3.4 (no subir a v4).
- **CMS**: Keystatic en modo `github` (commits directos a `main`). Editores: colaboradores del repo.
- **Hosting**: Cloudflare Workers + Static Assets, cuenta `62680f607b64e56109f6d9fbbd26abf7` (Free).
  - `entre-tormentas` (`wrangler.jsonc`): sitio vivo = año en curso + 300 notas más recientes.
    El código del Worker (`worker/index.js`) solo corre cuando no existe un archivo estático:
    Keystatic, redirect `/wp-content/uploads/*` → R2, fallback al archivo, slugs legacy.
  - `entre-tormentas-archivo` (`wrangler.archive.jsonc`): HTML estático del histórico
    (años anteriores). Se reconstruye 1 vez al año (`.github/workflows/archive.yml`).
- **Medios**: R2 `entretormentas-media` → `https://media.entretormentas.com` (WordPress
  convertido a `.webp`, misma ruta `AAAA/MM/nombre`). `src/lib/media.mjs` reescribe URLs.
- **Deploy**: `.github/workflows/deploy.yml` en cada push a `main`
  (secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
- **InsForge y Vercel ya no se usan.** No reintroducir `@insforge/sdk` ni `@astrojs/vercel`.

## Contenido

- Notas versionadas: `src/content/posts/*.md` (las que guarda Keystatic).
- Histórico comprimido: `src/archive/posts-archive.json.gz`.
- `scripts/prepare-content.mjs` decide qué entra en cada build (`BUILD_SCOPE=live|archive`)
  y extrae a `generated/posts/` (gitignored). Nunca desempaquetar en `src/content/posts`.

## Comandos

- `pnpm run build` → `dist/` (vivo) · `pnpm run deploy`
- `pnpm run build:archive` → `dist-archive/` · `pnpm run deploy:archive`
- Plan y bitácora de la migración: `odd/tasks/cloudflare-pages-migration.md`.
