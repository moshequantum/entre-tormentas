import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminApiRoute = pathname.startsWith('/api/admin/');
  const isAuthRoute = pathname.startsWith('/api/auth/') || pathname === '/login';
  const isKeystaticRoute = pathname.startsWith('/api/keystatic/') || pathname === '/keystatic';

  // Keystatic construye el `redirect_uri` de GitHub OAuth a partir del origin
  // de `request.url`. En Vercel esa URL llega como `https://localhost/...`, así
  // que GitHub rechaza el redirect porque la URI no está registrada en la OAuth
  // App (bug conocido: https://github.com/Thinkmill/keystatic/issues/1022).
  // Reconstruimos la URL con los headers que sí trae el proxy antes de que
  // Keystatic la lea.
  const forwardedHost = context.request.headers.get('x-forwarded-host');
  const forwardedProto = context.request.headers.get('x-forwarded-proto');
  const needsForwardedRewrite =
    url.hostname === 'localhost' && Boolean(forwardedHost && forwardedProto);

  const response = needsForwardedRewrite
    ? await next(
        new Request(
          new URL(
            `${forwardedProto!.split(',')[0].trim()}://${
              forwardedHost!.split(',')[0].trim()
            }${url.pathname}${url.search}`
          ),
          context.request
        )
      )
    : await next();

  // Enforce zero-caching across all admin, auth, editorial and CMS API endpoints
  if (isAdminRoute || isAdminApiRoute || isAuthRoute || isKeystaticRoute) {
    response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
});
