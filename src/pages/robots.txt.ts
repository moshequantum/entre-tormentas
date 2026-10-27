
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const robots = `# robots.txt for https://www.entretormentas.com
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /keystatic/

# Answer Engine Optimization (AEO) - Allow AI Crawlers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

# Sitemaps
Sitemap: https://www.entretormentas.com/sitemap.xml
`;

  return new Response(robots, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
};
