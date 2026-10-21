export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || url.searchParams.get('insforge_code');
  const token = url.searchParams.get('access_token') || url.searchParams.get('token');

  // If token is directly provided
  if (token) {
    cookies.set('entretormentas_session', token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return redirect('/admin');
  }

  // If code is provided, render client-side script to extract hash/PKCE parameters if needed
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Autenticando en Entre Tormentas...</title>
  <script>
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
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
  <p>Iniciando sesión en la Redacción de Entre Tormentas...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
