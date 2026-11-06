export const prerender = true;

import type { APIRoute } from 'astro';
import { BASE_URL, loadArchiveIndex, textResponse } from '../lib/seo';

// Índice de sitemaps: páginas, noticias vivas, Google News y archivo por año.
export const GET: APIRoute = async () => {
  const now = new Date().toISOString();
  const years = [...new Set(loadArchiveIndex().map((p) => p.date.slice(0, 4)).filter(Boolean))].sort().reverse();
  const maps = [
    'sitemap-paginas.xml',
    'sitemap-noticias.xml',
    'sitemap-news.xml',
    ...years.map((y) => `sitemap-archivo-${y}.xml`),
  ];

  return textResponse(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${maps.map((m) => `  <sitemap><loc>${BASE_URL}/${m}</loc><lastmod>${now}</lastmod></sitemap>`).join('\n')}
</sitemapindex>
`);
};
