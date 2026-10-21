export const prerender = false;

import type { APIRoute } from 'astro';
import { getInsForgeClient } from '../../../lib/insforge';

export const POST: APIRoute = async ({ request, cookies }) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
  };

  try {
    const body = await request.json().catch(() => ({}));
    const { code, verifier } = body;

    const codeVerifier = verifier || cookies.get('insforge_pkce_verifier')?.value;

    if (!code) {
      return new Response(JSON.stringify({ error: 'Código de autorización requerido.' }), {
        status: 400,
        headers,
      });
    }

    if (!codeVerifier) {
      return new Response(
        JSON.stringify({ error: 'No se encontró el verificador PKCE de la sesión.' }),
        { status: 400, headers }
      );
    }

    const insforge = getInsForgeClient();
    if (!insforge) {
      return new Response(
        JSON.stringify({ error: 'Servicio InsForge no disponible.' }),
        { status: 503, headers }
      );
    }

    const { data, error } = await insforge.auth.exchangeOAuthCode(code, codeVerifier);

    if (error || !data?.accessToken) {
      return new Response(
        JSON.stringify({ error: error?.message || 'Error al autenticar con Google/InsForge.' }),
        { status: 400, headers }
      );
    }

    // Set persistent session cookie (7 days)
    cookies.set('entretormentas_session', data.accessToken, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    // Save user metadata cookie
    if (data.user) {
      cookies.set(
        'entretormentas_user',
        JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || data.user.email.split('@')[0],
          role: data.user.role || 'editor',
        }),
        {
          path: '/',
          httpOnly: false,
          secure: import.meta.env.PROD,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
        }
      );
    }

    // Clean up temporary verifier
    cookies.delete('insforge_pkce_verifier', { path: '/' });

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Error inesperado en el servidor.' }),
      { status: 500, headers }
    );
  }
};
