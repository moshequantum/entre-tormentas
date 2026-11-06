# Entre Tormentas

Diario digital de Maracaibo, estado Zulia, Venezuela — **https://www.entretormentas.com**

> Código visible, no libre. Ver [LICENSE](LICENSE): no se permite copiar, desplegar
> ni republicar este proyecto ni su contenido sin permiso escrito.

## Arquitectura

```
Editor ─▶ /keystatic ─▶ commit en main ─▶ GitHub Actions ─▶ Cloudflare Worker `entre-tormentas`
                                                                  │
            ┌─────────────────────────────────────────────────────┤
            │ ¿existe el archivo estático?                        │
            │   sí → se sirve directo desde el CDN (sin código)   │
            │   no → worker/index.js                              │
            │         ├─ /keystatic, /api/keystatic/*  → Astro SSR (CMS)
            │         ├─ /wp-content/uploads/*         → 301 media.entretormentas.com
            │         ├─ nota de años anteriores       → Worker `entre-tormentas-archivo`
            │         └─ resto                         → slug legacy 301 · 404
            ▼
   media.entretormentas.com ─▶ R2 `entretormentas-media`
```

| Capa | Tecnología |
|---|---|
| Frontend | [Astro 5](https://astro.build) (salida estática) · Tailwind CSS 3.4 · React 19 (solo CMS) |
| CMS | [Keystatic](https://keystatic.com) en modo GitHub: cada "Guardar" es un commit |
| Hosting | Cloudflare Workers + Static Assets (Free) |
| Medios | Cloudflare R2 + dominio propio |
| CI/CD | GitHub Actions → `wrangler deploy` |

### Sitio vivo y archivo histórico

Para que cada publicación compile en ~2 minutos, el contenido se divide en dos:

| | Sitio vivo | Archivo |
|---|---|---|
| Contenido | Año en curso + 300 notas más recientes | Años anteriores |
| Worker | `entre-tormentas` | `entre-tormentas-archivo` |
| Se compila | En cada commit (`deploy.yml`) | 1 de enero (`archive.yml`) o a mano |
| Navegable | Portada, listados, categorías | Solo por URL directa, buscadores y sitemaps |

Las notas archivadas conservan su URL `/noticias/<slug>`: si el sitio vivo no tiene el
archivo, el Worker se lo pide al Worker de archivo. `scripts/prepare-content.mjs` decide
qué entra en cada build a partir de `src/content/posts/` (lo que guarda Keystatic) y
`src/archive/posts-archive.json.gz` (histórico comprimido).

## SEO · GEO · AEO

| Qué | Dónde |
|---|---|
| Meta, Open Graph, Twitter Cards, `hreflang es-VE`, geo-meta Maracaibo | `src/layouts/Layout.astro` |
| JSON-LD `@graph`: `NewsMediaOrganization`, `WebSite`, `WebPage`/`NewsArticle`, `BreadcrumbList`, `speakable` | `src/layouts/Layout.astro` |
| Índice de sitemaps (páginas, noticias, Google News, archivo por año, con imágenes) | `src/pages/sitemap*.ts` |
| `robots.txt` con permisos explícitos para buscadores y asistentes de IA | `src/pages/robots.txt.ts` |
| `llms.txt`: resumen del medio y últimas notas para modelos de lenguaje | `src/pages/llms.txt.ts` |
| RSS 2.0 con `media:content` y `dc:creator` | `src/pages/rss.xml.ts` |
| URLs canónicas sin barra final; `noindex` en el 404 | `Layout.astro`, `wrangler.jsonc` |

Después de cada cambio importante, valida con
[Rich Results Test](https://search.google.com/test/rich-results) y envía
`https://www.entretormentas.com/sitemap.xml` en Google Search Console y Bing Webmaster Tools.

## Rendimiento y seguridad

| Qué | Dónde |
|---|---|
| Variantes WebP 160/480/960/1600 px de todo `/images/**`, generadas en el build con caché por hash (`.image-cache/`, cacheada en Actions) | `scripts/optimize-images.mjs` |
| `<img {...img(src, 'thumb' \| 'card' \| 'hero' \| 'full')} />` → `src` + `srcset` + `sizes` | `src/lib/img.ts` |
| Imagen LCP con `fetchpriority="high"` y `<link rel="preload">` | `Layout.astro` (`preloadImage`) |
| Fuentes Geist servidas desde el propio dominio | `@fontsource-variable/geist` |
| HSTS, X-Frame-Options, Permissions-Policy, COOP, CSP mínima | `public/_headers` (estáticos) y `worker/index.js` (respuestas del Worker) |

Al agregar una imagen nueva en una plantilla, usa siempre `img()`: así se sirve la
variante del tamaño correcto y no el original de varios MB.

## Desarrollo

Requisitos: Node 22, pnpm 10.

```bash
pnpm install
pnpm dev                # http://localhost:4321 · CMS local en /keystatic
pnpm build              # sitio vivo → dist/
pnpm build:archive      # archivo histórico → dist-archive/
```

## Despliegue

Automático: cada push a `main` ejecuta `.github/workflows/deploy.yml`.

Manual (requiere `npx wrangler login` con la cuenta de Cloudflare de la empresa):

```bash
pnpm build && pnpm run deploy
pnpm build:archive && pnpm run deploy:archive
```

Rollback: `npx wrangler rollback` o, en el dashboard, Workers → `entre-tormentas` → Deployments.

### Secretos

| Dónde | Nombre |
|---|---|
| GitHub Actions | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Worker (`wrangler secret put`) | `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` |

Nunca se escriben secretos en el código ni en el repositorio.

## Estructura

```
src/
  content/posts/        notas (Markdown + frontmatter) que guarda Keystatic
  archive/              histórico comprimido
  components/           UI (listados paginados, cabecera, anuncios…)
  layouts/Layout.astro  <head> completo: SEO, OG, JSON-LD
  lib/                  media.mjs (URLs R2), seo.ts, posts-cache.ts, site-settings.ts
  pages/                rutas estáticas + sitemaps, robots, llms.txt, RSS
worker/                 Workers de Cloudflare (principal y archivo)
scripts/                prepare-content.mjs, build-archive.mjs, optimize-images.mjs, pack-posts-archive.mjs
odd/tasks/              planes y bitácoras de trabajo (ODD)
keystatic.config.ts     esquema del CMS
```

## Para editores

1. Entra a **https://www.entretormentas.com/keystatic** e inicia sesión con GitHub.
2. Escribe la nota y pulsa **Guardar**.
3. En unos 3 minutos aparece en la portada.

---

© Entre Tormentas · Tecnología y operación: Multiversa Group.
