# cloudflare-workers-migration

> ODD · Protocolo QUANTUM · G.E.N.O.V.A
> Inicio: 2026-11-06 · Owner: Moisés (@moshequantum) · Editor principal: Guillo (@guillosthormes-arch)
> Estado: **EN PRODUCCIÓN desde 2026-11-06 · repo público · pendientes: redirect apex→www, prueba de Guillo, Search Console**

## Objective

Sacar `entre-tormentas` de InsForge/Vercel y servirlo desde **Cloudflare Workers +
Static Assets** (Free Tier), con deploy por **GitHub Actions**, sin recompilar el
histórico en cada commit. Guillo no cambia nada de su flujo.

## Decisiones (con el owner, 2026-11-06)

1. **El histórico se empaqueta y se compila aparte, una vez al año.** El sitio vivo
   solo contiene el **año en curso + las 300 notas más recientes**. Las notas
   viejas siguen respondiendo en su misma URL (SEO intacto) desde un segundo Worker.
2. **Workers + Static Assets en vez de Pages**: Cloudflare sirve el archivo estático
   sin invocar código (gratis e ilimitado); el Worker solo corre cuando no existe el
   archivo. Eso permite el fallback al archivo sin gastar invocaciones en cada visita.
3. **Repo público con licencia propietaria**: aceptado por el owner, **pendiente**
   (ver Bloque 6). Mientras tanto el repo sigue privado; con el build reducido entra
   en los 2.000 min/mes gratis de Actions.
4. **Headless a futuro**: cuando haya flujo de caja para un VPS (≥ 3 años), Astro
   queda como frontend y el contenido pasa a un backend propio. Fuera de alcance aquí;
   ver "Siguiente fase".

## Arquitectura implementada

```
Guillo ─▶ /keystatic ─▶ commit en main ─▶ GitHub Actions (deploy.yml, ~2-3 min)
                                               │ pnpm build (≈2.850 notas)
                                               ▼
        www.entretormentas.com ─▶ Worker `entre-tormentas` (Static Assets: dist/)
             │ ¿existe el archivo?  sí ─▶ se sirve directo (sin código, gratis)
             │                      no ─▶ worker/index.js:
             │                              /keystatic, /api/keystatic/*   → Astro SSR
             │                              /wp-content/uploads/*          → 301 media.entretormentas.com/*.webp
             │                              cualquier otra                 → Worker `entre-tormentas-archivo`
             │                              si el archivo da 404           → Astro (slug legacy 301 / 404)
             ▼
        media.entretormentas.com ─▶ R2 `entretormentas-media` (58,5k objetos, 3,54 GB)
```

| Pieza | Archivo |
|---|---|
| Selección vivo/archivo | `scripts/prepare-content.mjs` (`BUILD_SCOPE`, `ARCHIVE_YEAR`) |
| Loader de contenido | `src/content.config.ts` (lee `src/content/posts` + `generated/posts`) |
| URLs de imágenes WP → R2 | `src/lib/media.mjs` (portadas en el schema + plugin remark para el cuerpo) |
| Worker principal | `worker/index.js` + `wrangler.jsonc` |
| Worker de archivo | `worker/archive.js` + `wrangler.archive.jsonc` + `scripts/build-archive.mjs` |
| CI | `.github/workflows/deploy.yml` (cada push) · `archive.yml` (1 de enero, o manual) |

## Medido (2026-11-06)

| Métrica | Valor | Límite Free |
|---|---|---|
| Notas totales | 9.462 (547 `.md` versionados + 8.915 comprimidos) | — |
| Notas en build vivo | 2.842 (todo 2026) | — |
| Archivos `dist/` | 3.597 | 20.000 por versión |
| Build vivo (Windows local) | 2 min 40 s | Actions: 2.000 min/mes (privado) |
| Worker comprimido | 334 KB | 3 MiB |
| Notas en archivo | 6.620 (2024–2025) → 6.624 archivos | 20.000 por versión |
| Build archivo (local) | 5 min 10 s (1 vez/año) | — |
| Archivo más pesado | 2,8 MB (`keystatic-page.js`) | 25 MiB |

Presupuesto de Actions: ~20 guardados/día × ~2,5 min ≈ 1.500 min/mes → entra en el
free privado, con poco margen. Si se pasa, el Bloque 6 (repo público) lo resuelve.

## Blocks & Tasks

### Bloque 1 — Desacoplar Vercel e InsForge ✅
- [x] T1 Borrar `vercel.json`, `wrangler.toml`; quitar `@astrojs/vercel` y `@insforge/sdk`.
- [x] T2 Borrar `src/lib/insforge.ts`, `src/lib/github-publisher.ts`, `src/pages/api/*`,
      `src/pages/admin/*`, `login.astro`, `wp-admin.astro`, `AdminLayout.astro`,
      proxy `wp-content/uploads/[...path].ts`. `/admin`, `/login`, `/wp-admin` → `/keystatic`
      vía `public/_redirects`.
- [x] T3 `astro.config.mjs`: solo `@astrojs/cloudflare`, sin variables `INSFORGE_*`.
- [x] T4 `src/middleware.ts` reducido a no-cache para Keystatic.
- [x] T5 Eliminar `cms-auto-deploy.yml` (InsForge) y `pack-posts-archive` del deploy.

### Bloque 2 — Build estático + histórico separado ✅
- [x] T6 `scripts/prepare-content.mjs`: vivo = año en curso + 300 recientes; archivo =
      anterior al 1 de enero. Extrae a `generated/posts/` (gitignored).
- [x] T7 Notas, categorías y listado → estáticos. Paginación `?page=N` → `/pagina/N`
      (`NewsListPage.astro`, `CategoryListPage.astro`); los enlaces viejos con `?page=`
      se redirigen en el navegador.
- [x] T8 `[slug].astro` (legacy WP) sin `astro:content`: 301 a `/noticias/{slug}`.
- [x] T9 Se borraron 5.586 `.md` sin versionar de `src/content/posts` (copias del
      desempaquetado anterior, verificadas contra el `.gz`; 1 con diferencias quedó
      respaldada fuera del repo).

### Bloque 3 — Medios ✅
- [x] T10 Confirmado: R2 `entretormentas-media` en la cuenta de empresa, con dominio
      `media.entretormentas.com`. Las imágenes están convertidas a `.webp`
      (`2025/07/meridalluvia1.jpeg` → `2025/07/meridalluvia1.webp`).
- [x] T11 Reescritura en build de `https://entretormentas.com/wp-content/uploads/...`
      → `https://media.entretormentas.com/....webp` (portadas y cuerpo). Lo que quede
      suelto lo redirige el Worker.

### Bloque 4 — Workers en Cloudflare ✅ (workers.dev)
- [x] T12 `entre-tormentas-archivo` desplegado (6.624 archivos, sin URL pública propia).
- [x] T13 `entre-tormentas` desplegado → https://entre-tormentas.multiversagroup.workers.dev
      (`compatibility_date 2025-09-01`: con fechas anteriores React 19 falla por `MessageChannel`).
- [x] T14 Pruebas: portada, `/noticias`, `/noticias/pagina/2`, categorías, nota 2026,
      nota 2025 (servida por el archivo, `X-ET-Source: archivo`), slug legacy → 301,
      `/wp-content/...` → 301 a R2, RSS, sitemap, robots, 404, `/keystatic` carga.
- [x] T15 Secretos del Worker: `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_SECRET` (nuevo, aleatorio).

### Bloque 5 — Acciones del owner (bloqueadas para el agente) ⏳
- [x] T16 **Client secret de Keystatic**: GitHub → Settings → Developer settings →
      GitHub Apps → `entre-tormentas-cms` → *Generate a new client secret*, y luego:
      `npx wrangler secret put KEYSTATIC_GITHUB_CLIENT_SECRET` (pegarlo cuando lo pida).
- [x] T17 **API Token de Cloudflare** (cuenta de empresa): My Profile → API Tokens →
      plantilla *Edit Cloudflare Workers* → cuenta `Multiversagroup@gmail.com's Account`,
      zona `entretormentas.com`. Guardarlo en GitHub:
      `gh secret set CLOUDFLARE_API_TOKEN -R moshequantum/entre-tormentas` y
      `gh secret set CLOUDFLARE_ACCOUNT_ID -R moshequantum/entre-tormentas -b 62680f607b64e56109f6d9fbbd26abf7`.
      Borrar `INSFORGE_CREDENTIALS_JSON` e `INSFORGE_PROJECT_JSON`.
- [x] T18 **Corte DNS**: en Cloudflare → `entretormentas.com` → DNS, borrar
      `A entretormentas.com 216.150.16.1` y `CNAME www → 6e2a5b0e41db4967.vercel-dns-016.com`.
      Después: `npx wrangler deploy` (crea los dominios propios del Worker con SSL).
      Rollback: volver a crear esos 2 registros (no sirve de mucho: Vercel está pausado).
- [x] T19 Producción verificada (2026-11-06): `www` → 200 `server: cloudflare`, nota 2025
      servida por el archivo, `/api/keystatic/github/login` → GitHub OAuth con el callback de `www`.
      CI: primer deploy automático OK en **1 min 54 s** (run 42273932732).
- [ ] T19b **Apex → www**: `entretormentas.com` sirve el sitio con 200 (los estáticos se
      sirven antes del Worker, que no alcanza a redirigir). Crear en la zona una Redirect Rule
      (plantilla *Redirect from root to WWW*, 301, preservar query string). Mientras tanto el
      `canonical` apunta a `www`, así que no hay penalización SEO.

### Bloque 6 — Repo público con licencia propietaria ⏳
- [x] T20 `LICENSE` propietaria (código visible, uso prohibido sin permiso escrito).
- [x] T21a Escaneo del historial (2026-11-06): **la clave R2 (Access Key ID + Secret) está
      hardcodeada** como valor por defecto en `src/pages/api/admin/upload.ts` desde
      `9c2b977c` (2026-10-21) y sigue en commits posteriores. No se encontraron tokens de
      GitHub, claves InsForge ni `.env` versionados. `scripts/upload-storage.cjs` solo lee env.
- [x] T21b **Owner**: R2 → Manage API Tokens → revocar el token cuyo Access Key ID aparece
      en `9c2b977c` y crear uno nuevo si `scripts/upload-storage.cjs` lo necesita. Rotar
      basta: reescribir el historial no hace falta si la clave ya no sirve.
- [x] T21c Owner hizo **Roll** del token de cuenta `entretormentas-media` (2026-11-06): el secreto
      filtrado ya no es válido. Imágenes en `media.entretormentas.com` verificadas tras el Roll.
- [x] T22 Repo **público** desde 2026-11-06 (`gh repo edit --visibility public`). GitHub reporta la
      licencia como `NOASSERTION` (propietaria). Actions pasa a minutos ilimitados.
      **Límite real**: los Términos de GitHub permiten a cualquier usuario ver y hacer
      *fork* de un repo público dentro de GitHub; la licencia prohíbe *usarlo*,
      no lo impide técnicamente. Si eso no es aceptable, mantener privado.

### Bloque 6b — SEO · GEO · AEO · OG ✅ (2026-11-06)
- [x] JSON-LD unificado en `@graph`: `NewsMediaOrganization` (logo raster, áreas
      servidas Zulia/Venezuela), `WebSite`, `WebPage` o `NewsArticle` (autor institucional
      enlazado por `@id`, `isAccessibleForFree`, `speakable`), `BreadcrumbList`.
- [x] Canonical y `og:url` sin barra final (antes apuntaban a una URL que redirige).
- [x] `lang="es-VE"`, `hreflang` es-VE/x-default, `article:modified_time`, `article:publisher`,
      `og:image:secure_url`, preconnect a `media.entretormentas.com`.
- [x] Títulos y descripciones únicos en páginas `/pagina/N`; `noindex, follow` en el 404.
- [x] Índice de sitemaps: `sitemap-paginas`, `sitemap-noticias` (2.842, con imagen),
      `sitemap-news` (Google News, 48 h), `sitemap-archivo-2024` (3.091) y `-2025` (3.529).
      El archivo vuelve a ser descubrible sin re-renderizarse
      (`generated/archive-index.json` lo genera `prepare-content.mjs`).
- [x] `robots.txt` con permisos explícitos a buscadores e IA (GPTBot, OAI-SearchBot,
      PerplexityBot, ClaudeBot, Google-Extended…); solo se cierran `/keystatic` y `/api/`.
- [x] `llms.txt` (secciones + últimas 60 notas) para AEO/GEO.
- [x] RSS con `dc:creator` (el `<author>` de RSS 2.0 exige email).
- [x] `workers_dev: false`: la URL de pruebas ya no duplica el sitio.
- [x] `README.md` con arquitectura, SEO, operación y guía de editores.
- [ ] **Owner**: enviar `https://www.entretormentas.com/sitemap.xml` en Google Search
      Console y Bing Webmaster Tools; postular el medio en Google Publisher Center (News).
- [ ] **Owner**: confirmar que las cuentas de `sameAs` (X, Instagram, Facebook
      `EntreTormentas`) existen y son las oficiales; si no, corregirlas en `Layout.astro`.
- [ ] Editorial: hay notas duplicadas con distinto slug (p. ej. dos "EN FRANCISCO E.
      BUSTAMANTE…" del 2026-11-06). Borrar la sobrante en Keystatic.

### Bloque 7 — Cierre ⏳
- [x] T23a El owner inició sesión en `/keystatic` en producción y todo funciona (2026-11-06).
- [ ] T23b Guillo publica una nota real y se mide guardar → visible (meta ≤ 5 min).
- [ ] T24 +7 días estables: borrar proyecto InsForge del cliente y el proyecto Vercel
      `prj_eyHDWZkGoZi9aEzPmoyi0FjkhsSi` (OWNER, irreversible).

## Operación

- **Rollback de un deploy**: Cloudflare → Workers → `entre-tormentas` → Deployments →
  versión anterior → *Rollback*. O `npx wrangler rollback`.
- **Deploy manual** (si Actions no tiene minutos): `pnpm run build && pnpm run deploy`.
- **Cambio de año**: `archive.yml` corre solo el 1 de enero (04:30 UTC). Mueve el año
  cerrado al Worker de archivo y republica el vivo. Se puede lanzar a mano desde Actions.
- **Editar una nota vieja**: Keystatic sigue permitiéndolo, pero el cambio solo se ve
  tras el rebuild del archivo (manual con `archive.yml`).

## Guía de 1 minuto para Guillo

1. Entra a **www.entretormentas.com/keystatic** e inicia sesión con GitHub (como siempre).
2. Escribe la nota y pulsa **Guardar**.
3. Espera unos **5 minutos** y recarga la portada. Listo.

Si a los 10 minutos no aparece, avisa a Moisés con el titular. Evita guardar muchas
veces seguidas: cada guardado reinicia la publicación.

## Siguiente fase — Portal headless (con VPS)

Astro como frontend puro; el contenido sale de un backend propio (Postgres + API)
en un VPS contratado ≥ 3 años. Con eso: búsqueda, archivo navegable completo,
ISR/rebuild por nota y editor sin depender de commits. Se abrirá su propio ODD.

## Acceptance Criteria

- [x] Ningún código importa `@insforge/sdk` ni `@astrojs/vercel`.
- [x] Build vivo < 20.000 archivos y Worker < 3 MiB, sin contenido de notas en el bundle.
- [x] Notas viejas responden en su misma URL desde el Worker de archivo.
- [x] `https://www.entretormentas.com` → 200 desde Cloudflare. (apex → 301 pendiente, T19b)
- [ ] Guillo publica desde `/keystatic` y la nota aparece en ≤ 5 min.
- [ ] Primer mes dentro del Free Tier (anotar minutos de Actions reales aquí).
      Referencia: 1 min 54 s por deploy → ~20 guardados/día ≈ 1.150 min/mes (límite 2.000).

## Deviations

- Se usó **Workers + Static Assets** en lugar de Pages: es lo único que permite el
  fallback al archivo sin invocar código en cada visita.
- El archivo histórico **no se navega** por listados/categorías (solo por URL directa,
  enlaces externos y buscadores), por decisión del owner.
- El agente no pudo escribir secretos de GitHub ni cambiar DNS (bloqueado por política
  de permisos); quedaron como T16–T18 del owner, ya completadas.
- `.npmrc` (`only-built-dependencies=...`) rompía `pnpm/action-setup` en CI; se movió a
  `onlyBuiltDependencies` en `pnpm-workspace.yaml`.
