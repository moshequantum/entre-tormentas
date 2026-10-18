export const prerender = false;

import type { APIRoute } from 'astro';

// Fallback placeholder image
const DEFAULT_FALLBACK = '/images/posts/default-post.jpg';

export const GET: APIRoute = async ({ params, request }) => {
  const mediaPath = params.path;
  if (!mediaPath) {
    return Response.redirect(new URL(DEFAULT_FALLBACK, request.url), 302);
  }

  // Remote CDN / Object Storage URL (Cloudflare R2 or InsForge S3)
  // Configurable via environment variable MEDIA_CDN_URL in Vercel
  const cdnBase = process.env.MEDIA_CDN_URL || process.env.PUBLIC_MEDIA_URL;

  if (!cdnBase) {
    // If CDN is not configured yet, redirect gracefully to default post placeholder
    return Response.redirect(new URL(DEFAULT_FALLBACK, request.url), 302);
  }

  const cleanBase = cdnBase.replace(/\/+$/, '');
  const targetUrl = `${cleanBase}/${mediaPath}`;

  try {
    // Try fetching direct requested URL
    let res = await fetch(targetUrl, { method: 'GET' });

    // If 404 and path didn't end in .webp, try appending .webp (WordPress optimization artifact)
    if (!res.ok && !mediaPath.endsWith('.webp')) {
      const webpUrl = `${cleanBase}/${mediaPath}.webp`;
      const webpRes = await fetch(webpUrl, { method: 'GET' });
      if (webpRes.ok) {
        res = webpRes;
      }
    }

    if (!res.ok) {
      return Response.redirect(new URL(DEFAULT_FALLBACK, request.url), 302);
    }

    const contentType = res.headers.get('content-type') || 'image/webp';
    const body = await res.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return Response.redirect(new URL(DEFAULT_FALLBACK, request.url), 302);
  }
};
