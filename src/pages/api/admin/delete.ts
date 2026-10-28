export const prerender = false;

import type { APIRoute } from 'astro';
import { deleteArticleFromGitHub, publishArticleToGitHub } from '../../../lib/github-publisher';
import { getEntry } from 'astro:content';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionToken =
      cookies.get('entretormentas_session')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'No autorizado. Iniciá sesión en el backoffice.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { slug, action = 'trash' } = body;

    if (!slug || typeof slug !== 'string') {
      return new Response(
        JSON.stringify({ error: 'El identificador (slug) de la entrada es requerido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanSlug = slug.trim();

    // 1. Permanent deletion from repository
    if (action === 'delete_permanent') {
      const result = await deleteArticleFromGitHub(cleanSlug);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Trash or Restore: fetch current post data to update frontmatter status
    let post = await getEntry('posts', cleanSlug);
    if (!post) {
      post = await getEntry('posts', `${cleanSlug}.md`);
    }

    if (!post) {
      return new Response(
        JSON.stringify({ error: `La entrada "${cleanSlug}" no fue encontrada.` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const targetStatus = action === 'restore' ? 'draft' : 'trash';

    const result = await publishArticleToGitHub({
      slug: cleanSlug,
      title: post.data.title,
      category: post.data.category || 'regionales',
      author: post.data.author || 'Redacción Entre Tormentas',
      excerpt: post.data.excerpt,
      content: post.body || '',
      coverImage: post.data.coverImage,
      isFeatured: post.data.isFeatured,
      isBreaking: post.data.isBreaking,
      publishedAt: post.data.publishedAt
        ? new Date(post.data.publishedAt).toISOString().split('T')[0]
        : undefined,
      status: targetStatus,
    });

    return new Response(
      JSON.stringify({
        success: true,
        action,
        status: targetStatus,
        message:
          action === 'restore'
            ? `Entrada restaurada a Borrador.`
            : `Entrada movida a la Papelera.`,
        commitSha: result.commitSha,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error al gestionar estado o eliminación:', err);
    return new Response(
      JSON.stringify({
        error: err.message || 'Error al procesar la solicitud en el repositorio.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
