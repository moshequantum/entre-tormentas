export const prerender = false;

import type { APIRoute } from 'astro';
import { publishArticleToGitHub } from '../../../lib/github-publisher';

const VALID_CATEGORIES = [
  'regionales',
  'nacionales',
  'sucesos',
  'deportes',
  'internacionales',
  'espectaculos',
  'opinion',
];

const VALID_STATUSES = ['published', 'draft', 'review', 'trash'];

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionToken =
      cookies.get('entretormentas_session')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    // Require active session
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'No autorizado. Iniciá sesión en la Redacción para publicar.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      slug,
      title,
      category,
      author,
      excerpt,
      content,
      coverImage,
      isFeatured,
      isBreaking,
      publishedAt,
      status,
    } = body;

    // Strict validation
    if (!title || typeof title !== 'string' || title.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'El título es obligatorio y debe tener al menos 5 caracteres.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'El cuerpo de la noticia debe tener al menos 10 caracteres.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanCategory = (category || 'regionales').toLowerCase().trim();
    if (!VALID_CATEGORIES.includes(cleanCategory)) {
      return new Response(
        JSON.stringify({
          error: `Categoría inválida. Debe ser una de: ${VALID_CATEGORIES.join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanStatus = (status || 'published').toLowerCase().trim();
    if (!VALID_STATUSES.includes(cleanStatus)) {
      return new Response(
        JSON.stringify({
          error: `Estado inválido. Debe ser uno de: ${VALID_STATUSES.join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Execute server-to-server GitHub publish
    const result = await publishArticleToGitHub({
      slug: slug ? slug.trim() : undefined,
      title: title.trim(),
      category: cleanCategory,
      author: (author || 'Redacción Entre Tormentas').trim(),
      excerpt: excerpt ? excerpt.trim() : undefined,
      content: content.trim(),
      coverImage: coverImage ? coverImage.trim() : undefined,
      isFeatured: Boolean(isFeatured),
      isBreaking: Boolean(isBreaking),
      publishedAt: publishedAt || new Date().toISOString().split('T')[0],
      status: cleanStatus as 'published' | 'draft' | 'review' | 'trash',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Entrada procesada y guardada exitosamente.',
        slug: result.slug,
        status: cleanStatus,
        commitSha: result.commitSha,
        commitUrl: result.commitUrl,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error publicando noticia:', err);
    return new Response(
      JSON.stringify({
        error: err.message || 'Error al guardar la noticia en el repositorio.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
