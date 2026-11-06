export const prerender = true;

import type { APIRoute } from 'astro';
import { BASE_URL, textResponse } from '../lib/seo';

// Buscadores y asistentes de IA (AEO/GEO) pueden leer todo el contenido público.
// Solo se cierran el CMS y sus APIs.
const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'DuckAssistBot',
  'Meta-ExternalAgent',
  'CCBot',
];

export const GET: APIRoute = async () => {
  const blocked = ['Disallow: /keystatic', 'Disallow: /api/'].join('\n');
  const body = [
    `# robots.txt — ${BASE_URL}`,
    'User-agent: *',
    'Allow: /',
    blocked,
    '',
    '# Asistentes y motores de respuesta (AEO / GEO)',
    ...AI_AGENTS.map((agent) => `User-agent: ${agent}\nAllow: /\n${blocked}\n`),
    '# Resumen del sitio para modelos de lenguaje',
    `# ${BASE_URL}/llms.txt`,
    '',
    `Sitemap: ${BASE_URL}/sitemap.xml`,
    `Sitemap: ${BASE_URL}/sitemap-news.xml`,
    '',
  ].join('\n');

  return textResponse(body, 'text/plain; charset=utf-8');
};
