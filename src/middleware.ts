import { defineMiddleware } from 'astro:middleware';

// Solo corre en el Worker (Keystatic y redirecciones legacy); las páginas
// públicas son estáticas y sus cabeceras viven en public/_headers.
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const { pathname } = context.url;
  if (pathname === '/keystatic' || pathname.startsWith('/keystatic/') || pathname.startsWith('/api/keystatic/')) {
    response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  }
  return response;
});
