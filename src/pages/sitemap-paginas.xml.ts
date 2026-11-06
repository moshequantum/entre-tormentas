export const prerender = true;

import type { APIRoute } from 'astro';
import { BASE_URL, CATEGORIES, textResponse } from '../lib/seo';

export const GET: APIRoute = async () => {
  const pages = [
    { loc: '/', freq: 'always', priority: '1.0' },
    { loc: '/noticias', freq: 'always', priority: '0.9' },
    ...CATEGORIES.map((c) => ({ loc: `/categoria/${c}`, freq: 'hourly', priority: '0.8' })),
    { loc: '/terminos', freq: 'yearly', priority: '0.2' },
    { loc: '/privacidad', freq: 'yearly', priority: '0.2' },
    { loc: '/accesibilidad', freq: 'yearly', priority: '0.2' },
  ];

  return textResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map((p) => `  <url><loc>${BASE_URL}${p.loc}</loc><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`)
  .join('\n')}
</urlset>
`);
};
