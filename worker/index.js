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
const REPO = 'moshequantum/entre-tormentas';
const GH_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'entre-tormentas-worker',
};

const KEYSTATIC_DEPLOY_WIDGET = `<script>
(() => {
  if (document.getElementById('et-deploy-widget')) return;
  const box = document.createElement('div');
  box.id = 'et-deploy-widget';
  box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:9999px;background:#0f172a;color:#f8fafc;border:1px solid #334155;box-shadow:0 8px 24px rgba(0,0,0,.35);font-family:system-ui,-apple-system,sans-serif;font-size:12px;';
  const dot = document.createElement('span');
  dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#64748b;display:inline-block;flex-shrink:0;';
  const label = document.createElement('span');
  label.textContent = 'Estado...';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Publicar ahora';
  btn.style.cssText = 'padding:4px 10px;border-radius:9999px;border:none;background:#0284c7;color:#fff;font-weight:600;font-size:12px;cursor:pointer;';
  box.append(dot, label, btn);
  document.body.appendChild(box);

  let timer = null;
  async function refresh() {
    try {
      const r = await fetch('/api/deploy', { credentials: 'same-origin' });
      if (r.status === 401 || r.status === 403) { box.style.display = 'none'; return; }
      const d = await r.json();
      box.style.display = 'flex';
      if (d.upToDate) {
        dot.style.background = '#22c55e';
        label.textContent = 'Sitio al día';
      } else if (d.latestRun && d.latestRun.status === 'in_progress') {
        dot.style.background = '#f59e0b';
        label.textContent = 'Publicando...';
      } else {
        dot.style.background = '#ef4444';
        label.textContent = 'Cambios pendientes';
      }
    } catch {}
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    try {
      const r = await fetch('/api/deploy', { method: 'POST', credentials: 'same-origin' });
      const d = await r.json();
      if (!r.ok) {
        alert(d.error || 'No se pudo iniciar la publicación.');
      } else {
        dot.style.background = '#f59e0b';
        label.textContent = 'Runner activado';
        clearInterval(timer);
        timer = setInterval(refresh, 8000);
      }
    } catch {
      alert('Error de red al contactar /api/deploy.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Publicar ahora';
    }
  });

  refresh();
  setInterval(refresh, 30000);
})();
</script>`;

function getCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}

async function verifyEditor(request) {
  const token = getCookie(request, 'keystatic-gh-access-token');
  if (!token) return { error: json({ ok: false, error: 'Inicia sesión en Keystatic primero.' }, 401) };

  const res = await fetch(`https://api.github.com/repos/${REPO}`, {
    headers: { ...GH_HEADERS, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { error: json({ ok: false, error: 'Sesión de GitHub inválida o expirada.' }, 401) };
  const repo = await res.json();
  if (!repo?.permissions?.push) {
    return { error: json({ ok: false, error: 'Sin permisos de escritura en el repositorio.' }, 403) };
  }
  return { token };
}

async function handleDeployApi(request, env) {
  const auth = await verifyEditor(request);
  if (auth.error) return auth.error;
  const ghToken = env?.GITHUB_DEPLOY_TOKEN || auth.token;
  const headers = { ...GH_HEADERS, Authorization: `Bearer ${ghToken}` };

  if (request.method === 'GET') {
    const [commitRes, runsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${REPO}/commits/main`, { headers }),
      fetch(`https://api.github.com/repos/${REPO}/actions/workflows/deploy.yml/runs?branch=main&per_page=5`, { headers }),
    ]);
    if (!commitRes.ok || !runsRes.ok) {
      return json({ ok: false, error: 'No se pudo consultar el estado en GitHub.' }, 502);
    }
    const commit = await commitRes.json();
    const runs = await runsRes.json();
    const headSha = commit.sha;
    const list = runs.workflow_runs || [];
    const matchingSuccess = list.some((r) => r.head_sha === headSha && r.conclusion === 'success');
    const latestRun = list[0] || null;
    return json({
      ok: true,
      headSha,
      headMessage: (commit.commit?.message || '').split('\n')[0],
      headDate: commit.commit?.committer?.date || null,
      upToDate: matchingSuccess,
      latestRun: latestRun
        ? {
            id: latestRun.id,
            status: latestRun.status,
            conclusion: latestRun.conclusion,
            created_at: latestRun.created_at,
            html_url: latestRun.html_url,
          }
        : null,
    });
  }

  if (request.method === 'POST') {
    const dispatchRes = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/deploy.yml/dispatches`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: 'main' }),
      },
    );
    if (dispatchRes.status === 204) {
      return json({ ok: true, message: 'Publicación iniciada en GitHub Actions.' });
    }
    if (dispatchRes.status === 403) {
      return json(
        {
          ok: false,
          error: 'Falta permiso actions:write en la GitHub App o configurar GITHUB_DEPLOY_TOKEN en Cloudflare.',
        },
        403,
      );
    }
    return json({ ok: false, error: `GitHub devolvió HTTP ${dispatchRes.status}.` }, 502);
  }

  return json({ ok: false, error: 'Método no permitido.' }, 405);
}

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

  if (url.pathname === '/api/deploy') return handleDeployApi(request, env);

  if (KEYSTATIC.test(url.pathname)) {
    const res = await astro.fetch(request, env, ctx);
    const ct = res.headers.get('content-type') || '';
    if (request.method === 'GET' && !url.pathname.startsWith('/api/') && ct.includes('text/html')) {
      const html = await res.text();
      if (html.includes('</body>')) {
        const headers = new Headers(res.headers);
        headers.delete('content-length');
        return new Response(html.replace('</body>', `${KEYSTATIC_DEPLOY_WIDGET}</body>`), {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
      }
      return new Response(html, res);
    }
    return res;
  }

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
