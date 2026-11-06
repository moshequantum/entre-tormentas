export const prerender = true;

import type { APIRoute, GetStaticPaths } from 'astro';
import { BASE_URL, absoluteUrl, escapeXml, loadArchiveIndex, textResponse } from '../lib/seo';

// Sitemap del histórico, uno por año. Se genera en el build vivo a partir del índice
// liviano, sin renderizar las notas (esas viven en el Worker de archivo).
export const getStaticPaths: GetStaticPaths = () => {
  const years = new Set(loadArchiveIndex().map((p) => p.date.slice(0, 4)).filter(Boolean));
  return [...years].map((year) => ({ params: { year } }));
};

export const GET: APIRoute = ({ params }) => {
  const posts = loadArchiveIndex().filter((p) => p.date.startsWith(String(params.year)));

  const urls = posts.map((p) => {
    const image = absoluteUrl(p.cover);
    return [
      '  <url>',
      `    <loc>${BASE_URL}/noticias/${p.slug}</loc>`,
      p.date ? `    <lastmod>${p.date}</lastmod>` : '',
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
