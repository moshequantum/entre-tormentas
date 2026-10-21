export const prerender = false;

import type { APIRoute } from 'astro';
import { getInsForgeClient } from '../../../lib/insforge';

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

  // 2. PKCE Authorization Code Exchange (Server-to-Server with InsForge)
  if (code) {
    const verifier = cookies.get('insforge_pkce_verifier')?.value;
    const insforge = getInsForgeClient();

    if (insforge && verifier) {
      try {
        const { data, error } = await insforge.auth.exchangeOAuthCode(code, verifier);

        if (error || !data?.accessToken) {
          console.error('InsForge PKCE exchange failed:', error?.message || 'No access token returned');
          return redirect(`/login?error=${encodeURIComponent(error?.message || 'Error al intercambiar código de autenticación.')}`);
        }

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

        // Clean up temporary PKCE verifier cookie
        cookies.delete('insforge_pkce_verifier', { path: '/' });

        return redirect('/admin');
      } catch (err: any) {
        console.error('Unexpected error in code exchange:', err);
        return redirect(`/login?error=${encodeURIComponent('Error inesperado al validar sesión con InsForge.')}`);
      }
    } else {
      console.warn('Missing PKCE verifier or InsForge client for code exchange');
    }
  }

  // 3. Fallback Client-Side Hash/Parameter handler
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Autenticando en EntreTormentas CMS...</title>
  <script>
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash || window.location.search);
    const token = params.get('access_token');
    if (token) {
      document.cookie = 'entretormentas_session=' + token + '; path=/; max-age=604800; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
      window.location.href = '/admin';
    } else {
      window.location.href = '/admin';
    }
  </script>
</head>
<body style="background: #060b13; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh;">
  <p>Iniciando sesión en EntreTormentas CMS...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
