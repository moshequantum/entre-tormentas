export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete('entretormentas_session', { path: '/' });
  cookies.delete('entretormentas_user', { path: '/' });
  cookies.delete('insforge_pkce_verifier', { path: '/' });
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('entretormentas_session', { path: '/' });
  cookies.delete('entretormentas_user', { path: '/' });
  cookies.delete('insforge_pkce_verifier', { path: '/' });
  return redirect('/login');
};
