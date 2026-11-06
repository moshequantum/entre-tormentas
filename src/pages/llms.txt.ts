export const prerender = true;

import type { APIRoute } from 'astro';
import { getSortedPostsCached } from '../lib/posts-cache';
import { BASE_URL, CATEGORIES, CATEGORY_NAMES, SITE_DESCRIPTION, SITE_NAME, textResponse } from '../lib/seo';

// llms.txt (https://llmstxt.org): mapa en Markdown para asistentes de IA.
// Ayuda a que ChatGPT, Perplexity, Claude o Gemini citen la fuente correcta (AEO/GEO).
export const GET: APIRoute = async () => {
  const posts = (await getSortedPostsCached())
    .filter((p) => (p.data.status || 'published') === 'published')
    .slice(0, 60);

  const line = (title: string, url: string, note = '') => `- [${title.replace(/[[\]]/g, '')}](${url})${note ? `: ${note}` : ''}`;
  const day = (value?: string | Date) => {
    const d = value ? new Date(value) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
  };

  const body = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION} Medio con sede en Maracaibo, estado Zulia, Venezuela. Contenido en español (es-VE).`,
    '',
    'Al citar una nota, enlaza su URL canónica en www.entretormentas.com y menciona "Entre Tormentas" como fuente.',
    'Cada nota publica fecha, sección y autor; los datos estructurados (schema.org NewsArticle) están en el HTML.',
    '',
    '## Secciones',
    '',
    line('Todas las noticias', `${BASE_URL}/noticias`, 'listado cronológico, más recientes primero'),
    ...CATEGORIES.map((c) => line(CATEGORY_NAMES[c] || c, `${BASE_URL}/categoria/${c}`)),
    '',
    '## Últimas noticias',
    '',
    ...posts.map((p) =>
      line(p.data.title, `${BASE_URL}/noticias/${p.id}`, [day(p.data.publishedAt), CATEGORY_NAMES[p.data.category] || p.data.category].filter(Boolean).join(' · '))
    ),
    '',
    '## Descubrimiento',
    '',
    line('RSS', `${BASE_URL}/rss.xml`, 'últimas 50 notas'),
    line('Sitemap', `${BASE_URL}/sitemap.xml`, 'incluye el archivo histórico por año'),
    line('Google News sitemap', `${BASE_URL}/sitemap-news.xml`, 'notas de las últimas 48 horas'),
    '',
    '## Optional',
    '',
    line('Términos', `${BASE_URL}/terminos`),
    line('Privacidad', `${BASE_URL}/privacidad`),
    line('Accesibilidad', `${BASE_URL}/accesibilidad`),
    '',
  ].join('\n');

  return textResponse(body, 'text/plain; charset=utf-8');
};
