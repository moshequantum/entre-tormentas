export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('entretormentas_session', { path: '/' });
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('entretormentas_session', { path: '/' });
  return redirect('/login');
};
