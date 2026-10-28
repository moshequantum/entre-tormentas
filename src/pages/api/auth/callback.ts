export const prerender = false;

import type { APIRoute } from 'astro';
import { getInsForgeClient } from '../../../lib/insforge';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('insforge_code') || url.searchParams.get('code');
  const token = url.searchParams.get('access_token') || url.searchParams.get('token');
  const oauthError = url.searchParams.get('error') || url.searchParams.get('error_description');

  if (oauthError) {
    console.error('OAuth error from provider:', oauthError);
    return redirect(`/login?error=${encodeURIComponent(oauthError)}`);
  }

  // 1. Direct Access Token handling
  if (token) {
    cookies.set('entretormentas_session', token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return redirect('/admin');
  }

  // 2. Server-side PKCE Exchange (if cookie arrived with request)
  if (code) {
    const rawCookie = request.headers.get('cookie') || '';
    const cookieMatch = rawCookie.match(/(?:^|;\s*)insforge_pkce_verifier=([^;]*)/);
    const verifier = cookies.get('insforge_pkce_verifier')?.value || (cookieMatch ? decodeURIComponent(cookieMatch[1]) : undefined);
    const insforge = getInsForgeClient();

    if (insforge && verifier) {
      try {
        const { data, error } = await insforge.auth.exchangeOAuthCode(code, verifier);

        if (!error && data?.accessToken) {
          // Set persistent session cookie (7 days)
          cookies.set('entretormentas_session', data.accessToken, {
            path: '/',
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
          });

          // Store user metadata for editorial UI
          if (data.user) {
            cookies.set('entretormentas_user', JSON.stringify({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name || data.user.email.split('@')[0],
              role: data.user.role || 'editor',
            }), {
              path: '/',
              httpOnly: false,
              secure: import.meta.env.PROD,
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7,
            });
          }

          cookies.delete('insforge_pkce_verifier', { path: '/' });
          return redirect('/admin');
        }
      } catch (err: any) {
        console.error('Server-side PKCE exchange attempt failed, falling back to client exchange:', err);
      }
    }
  }

  // 3. Client-Side Active Exchange & Fallback Handler
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificando Redacción | EntreTormentas CMS</title>
  <style>
    body {
      background: #060b13;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
      padding: 1rem;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.1);
      border-radius: 50%;
      border-top-color: #0055ff;
      animation: spin 0.8s ease-in-out infinite;
      margin-bottom: 1.5rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .title {
      font-size: 1.1rem;
      font-weight: 500;
      color: #e2e8f0;
      margin-bottom: 0.5rem;
    }
    .status {
      font-size: 0.85rem;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div class="title">Verificando credenciales...</div>
  <div id="status-text" class="status">Conectando con la Mesa de Redacción...</div>

  <script>
    async function handleAuth() {
      const statusText = document.getElementById('status-text');
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(window.location.search);

      // Check direct access token in hash or query
      const token = hashParams.get('access_token') || searchParams.get('access_token');
      if (token) {
        document.cookie = 'entretormentas_session=' + token + '; path=/; max-age=604800; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
        window.location.href = '/admin';
        return;
      }

      // Check authorization code
      const code = searchParams.get('insforge_code') || searchParams.get('code');
      const verifier = sessionStorage.getItem('insforge_pkce_verifier') || localStorage.getItem('insforge_pkce_verifier');

      if (code) {
        if (statusText) statusText.textContent = 'Intercambiando código de seguridad...';
        try {
          const res = await fetch('/api/auth/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code, verifier: verifier })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            sessionStorage.removeItem('insforge_pkce_verifier');
            localStorage.removeItem('insforge_pkce_verifier');
            window.location.href = '/admin';
          } else {
            console.error('Exchange error:', data.error);
            window.location.href = '/login?error=' + encodeURIComponent(data.error || 'Error al validar código con InsForge.');
          }
        } catch (err) {
          console.error('Network error during exchange:', err);
          window.location.href = '/login?error=' + encodeURIComponent('Error de red al procesar autenticación.');
        }
      } else {
        window.location.href = '/login?error=' + encodeURIComponent('No se recibió código de autorización del proveedor.');
      }
    }

    handleAuth();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...NO_CACHE_HEADERS,
    },
  });
};
