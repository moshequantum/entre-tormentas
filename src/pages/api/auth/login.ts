export const prerender = false;

import type { APIRoute } from 'astro';
import { getInsForgeClient } from '../../../lib/insforge';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, provider, email, password, otp, redirectTo } = body;

    const insforge = getInsForgeClient();
    if (!insforge) {
      return new Response(
        JSON.stringify({
          error: 'Servicio de autenticación InsForge no configurado en el servidor.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Resolve clean public site origin (never localhost in production)
    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protoHeader = request.headers.get('x-forwarded-proto') || 'https';
    const siteUrl = (hostHeader && !hostHeader.includes('localhost'))
      ? `${protoHeader}://${hostHeader}`
      : (process.env.PUBLIC_SITE_URL || 'https://www.entretormentas.com');

    // Google / OAuth login
    if (provider === 'google') {
      const redirectUrl = redirectTo || `${siteUrl}/api/auth/callback`;
      const { data, error } = await insforge.auth.signInWithOAuth('google', {
        redirectTo: redirectUrl,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Store PKCE codeVerifier in a secure temporary HTTP-only cookie for callback exchange
      if (data?.codeVerifier) {
        cookies.set('insforge_pkce_verifier', data.codeVerifier, {
          path: '/',
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: 'lax',
          maxAge: 60 * 15, // 15 minutes
        });
      }

      return new Response(JSON.stringify({ url: data?.url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Password Login
    if (email && password) {
      const { data, error } = await insforge.auth.signInWithPassword({ email, password });
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: error?.message || 'Credenciales inválidas' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Set persistent session cookie (7 days)
      if (data.accessToken) {
        cookies.set('entretormentas_session', data.accessToken, {
          path: '/',
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
        });
      }

      if (data.user?.email) {
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

      return new Response(JSON.stringify({ success: true, user: data.user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Email OTP request
    if (action === 'send_otp' && email) {
      const { data, error } = await insforge.auth.signInWithOtp({ email });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, message: data?.message }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Email OTP verify
    if (action === 'verify_otp' && email && otp) {
      const { data, error } = await insforge.auth.verifyOtp({ email, otp });
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: error?.message || 'Código OTP inválido o expirado' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (data.accessToken) {
        cookies.set('entretormentas_session', data.accessToken, {
          path: '/',
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
      }

      return new Response(JSON.stringify({ success: true, user: data.user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Parámetros de autenticación requeridos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno de autenticación' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
