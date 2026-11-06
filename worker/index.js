// Worker de producción de entretormentas.com
//
// Cloudflare sirve primero los archivos estáticos de dist/ (gratis, sin invocar
// este código). Solo llegamos aquí cuando NO existe el archivo:
//   1. Keystatic (/keystatic, /api/keystatic/*)        → Astro SSR
//   2. /wp-content/uploads/* (imágenes en cuerpos viejos) → media.entretormentas.com (.webp)
//   3. Noticias del archivo histórico                   → Worker `entre-tormentas-archivo`
//   4. Resto (slugs legacy de WordPress, 404)            → Astro
import astro from '../dist/_worker.js/index.js';

const KEYSTATIC = /^\/(keystatic(\/|$)|api\/keystatic\/)/;
const WP_UPLOADS = /^\/wp-content\/uploads\/(.+?)(?:\.(?:jpe?g|png|gif|jfif|webp|bmp))?$/i;

// Mismas cabeceras que public/_headers aplica a los estáticos.
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Content-Security-Policy': "upgrade-insecure-requests; frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
};

function secure(response, extra = {}) {
  const res = new Response(response.body, response);
  for (const [name, value] of Object.entries({ ...SECURITY_HEADERS, ...extra })) {
    if (!res.headers.has(name)) res.headers.set(name, value);
  }
  return res;
}

async function route(request, env, ctx) {
  const url = new URL(request.url);

  if (url.hostname === 'entretormentas.com') {
    url.hostname = 'www.entretormentas.com';
    return Response.redirect(url.toString(), 301);
  }

  if (KEYSTATIC.test(url.pathname)) return astro.fetch(request, env, ctx);

  const wp = url.pathname.match(WP_UPLOADS);
  if (wp) return Response.redirect(`https://media.entretormentas.com/${wp[1]}.webp`, 301);

  if (env.ARCHIVE && (request.method === 'GET' || request.method === 'HEAD')) {
    const archived = await env.ARCHIVE.fetch(request);
    if (archived.status !== 404) {
      const res = new Response(archived.body, archived);
      res.headers.set('X-ET-Source', 'archivo');
      return res;
    }
  }

  return astro.fetch(request, env, ctx);
}

export default {
  async fetch(request, env, ctx) {
    return secure(await route(request, env, ctx));
  },
};
