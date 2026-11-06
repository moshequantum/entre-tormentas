export const prerender = true;

import type { APIRoute } from 'astro';
import { getSortedPostsCached } from '../lib/posts-cache';
import { BASE_URL, absoluteUrl, escapeXml, isoDate, textResponse } from '../lib/seo';

// Noticias del sitio vivo (año en curso + 300 más recientes), con su imagen principal.
export const GET: APIRoute = async () => {
  const posts = (await getSortedPostsCached()).filter((p) => (p.data.status || 'published') === 'published');

  const urls = posts.map((post) => {
    const lastmod = isoDate(post.data.publishedAt);
    const image = absoluteUrl(post.data.coverImage);
    return [
      '  <url>',
      `    <loc>${BASE_URL}/noticias/${post.id}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
      image ? `    <image:image><image:loc>${escapeXml(image)}</image:loc></image:image>` : '',
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n');
  });

  return textResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`);
};
