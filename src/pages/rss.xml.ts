export const prerender = true;

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const BASE_URL = 'https://www.entretormentas.com';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts');
  const sortedPosts = posts
    .filter((p) => p.data.publishedAt)
    .sort((a, b) => new Date(b.data.publishedAt || 0).getTime() - new Date(a.data.publishedAt || 0).getTime())
    .slice(0, 50);

  const items = sortedPosts.map((post) => {
    const title = escapeXml(post.data.title);
    const link = `${BASE_URL}/noticias/${post.id}`;
    const description = escapeXml(post.data.excerpt || post.data.title);
    const category = escapeXml(post.data.category || 'Regionales');
    const author = escapeXml(post.data.author || 'Redacción Entre Tormentas');
    
    let pubDate = '';
    try {
      const d = new Date(post.data.publishedAt!);
      pubDate = d.toUTCString();
    } catch (e) {
      pubDate = new Date().toUTCString();
    }

    let mediaTag = '';
    if (post.data.coverImage) {
      const imgUrl = post.data.coverImage.startsWith('http')
        ? post.data.coverImage
        : `${BASE_URL}${post.data.coverImage}`;
      mediaTag = `\n      <media:content url="${escapeXml(imgUrl)}" medium="image" />`;
    }

    return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${description}</description>
      <category>${category}</category>
      <author>${author}</author>
      <pubDate>${pubDate}</pubDate>${mediaTag}
    </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Entre Tormentas | Diario Digital del Zulia</title>
    <link>${BASE_URL}</link>
    <description>Noticias de actualidad, sucesos, deportes, regionales y política en el Zulia y Venezuela.</description>
    <language>es-VE</language>
    <copyright>© ${new Date().getFullYear()} Entre Tormentas. Todos los derechos reservados.</copyright>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items.join('')}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
};
