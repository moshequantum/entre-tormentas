export const prerender = true;

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const BASE_URL = 'https://www.entretormentas.com';

const CATEGORIES = [
  'regionales',
  'nacionales',
  'sucesos',
  'deportes',
  'internacionales',
  'espectaculos',
  'opinion'
];

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts');
  const sortedPosts = posts.sort(
    (a, b) => new Date(b.data.publishedAt || 0).getTime() - new Date(a.data.publishedAt || 0).getTime()
  );

  const urls: string[] = [];

  // Home Page
  urls.push(`
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>`);

  // Category Pages
  for (const cat of CATEGORIES) {
    urls.push(`
  <url>
    <loc>${BASE_URL}/categoria/${cat}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  // Articles (Most recent first, up to 5,000 in primary sitemap)
  for (const post of sortedPosts.slice(0, 5000)) {
    let lastMod = '';
    if (post.data.publishedAt) {
      try {
        const d = new Date(post.data.publishedAt);
        if (!isNaN(d.getTime())) {
          lastMod = `\n    <lastmod>${d.toISOString().split('T')[0]}</lastmod>`;
        }
      } catch (e) {
        // omit if date is invalid
      }
    }

    urls.push(`
  <url>
    <loc>${BASE_URL}/noticias/${post.id}</loc>${lastMod}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
