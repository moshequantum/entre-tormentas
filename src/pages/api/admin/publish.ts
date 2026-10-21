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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionToken = cookies.get('entretormentas_session')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');

    // Require active session
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'No autorizado. Iniciá sesión en la Redacción para publicar.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      title,
      category,
      author,
      excerpt,
      content,
      coverImage,
      isFeatured,
      isBreaking,
      publishedAt,
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

    // Execute server-to-server GitHub publish
    const result = await publishArticleToGitHub({
      title: title.trim(),
      category: cleanCategory,
      author: (author || 'Redacción Entre Tormentas').trim(),
      excerpt: excerpt ? excerpt.trim() : undefined,
      content: content.trim(),
      coverImage: coverImage ? coverImage.trim() : undefined,
      isFeatured: Boolean(isFeatured),
      isBreaking: Boolean(isBreaking),
      publishedAt: publishedAt || new Date().toISOString().split('T')[0],
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Noticia enviada y publicada exitosamente a GitHub.',
        slug: result.slug,
        commitSha: result.commitSha,
        commitUrl: result.commitUrl,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error publicando noticia:', err);
    return new Response(
      JSON.stringify({
        error: err.message || 'Error al publicar la noticia en el repositorio.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
