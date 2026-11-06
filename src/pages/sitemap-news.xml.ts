export const prerender = true;

import type { APIRoute } from 'astro';
import { getSortedPostsCached } from '../lib/posts-cache';
import { BASE_URL, SITE_NAME, escapeXml, isoDate, textResponse } from '../lib/seo';

// Google News: solo notas de los últimos 2 días (máx. 1.000). Se regenera en cada publicación.
export const GET: APIRoute = async () => {
  const since = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const posts = (await getSortedPostsCached())
    .filter((p) => (p.data.status || 'published') === 'published')
    .filter((p) => {
      const t = new Date(p.data.publishedAt || 0).getTime();
      return !Number.isNaN(t) && t >= since;
    })
    .slice(0, 1000);

  const urls = posts.map((post) =>
    [
      '  <url>',
      `    <loc>${BASE_URL}/noticias/${post.id}</loc>`,
      '    <news:news>',
      `      <news:publication><news:name>${SITE_NAME}</news:name><news:language>es</news:language></news:publication>`,
      `      <news:publication_date>${isoDate(post.data.publishedAt)}</news:publication_date>`,
      `      <news:title>${escapeXml(post.data.title)}</news:title>`,
      '    </news:news>',
      '  </url>',
    ].join('\n')
  );

  return textResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls.join('\n')}
</urlset>
`);
};
