export interface ArticlePayload {
  title: string;
  publishedAt?: string;
  category: string;
  isFeatured?: boolean;
  isBreaking?: boolean;
  author: string;
  coverImage?: string;
  excerpt?: string;
  content: string;
}

export interface PublishResult {
  success: boolean;
  slug: string;
  path: string;
  commitSha?: string;
  commitUrl?: string;
  error?: string;
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
    .replace(/[\s_-]+/g, '-') // Swap spaces for dashes
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing dashes
}

export async function publishArticleToGitHub(article: ArticlePayload): Promise<PublishResult> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER || 'moshequantum';
  const repo = process.env.GITHUB_REPO_NAME || 'entre-tormentas';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token) {
    throw new Error('GITHUB_TOKEN no está configurado en las variables de entorno del servidor.');
  }

  const slug = slugify(article.title);
  if (!slug) {
    throw new Error('El título de la noticia no genera un slug válido.');
  }

  const filePath = `src/content/posts/${slug}.md`;
  const publishedDate = article.publishedAt || new Date().toISOString().split('T')[0];

  // Construct Markdown with YAML frontmatter
  const safeExcerpt = (article.excerpt || article.title).replace(/"/g, '\\"');
  const safeTitle = article.title.replace(/"/g, '\\"');
  const safeAuthor = (article.author || 'Redacción Entre Tormentas').replace(/"/g, '\\"');
  const coverImage = article.coverImage || '/images/posts/default-post.jpg';

  const fileContent = `---
title: "${safeTitle}"
publishedAt: "${publishedDate}"
category: "${article.category.toLowerCase()}"
isFeatured: ${Boolean(article.isFeatured)}
isBreaking: ${Boolean(article.isBreaking)}
author: "${safeAuthor}"
coverImage: "${coverImage}"
excerpt: "${safeExcerpt}"
---

${article.content.trim()}
`;

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  // Check if file already exists to get its SHA (for update vs create)
  let existingSha: string | undefined;
  try {
    const checkRes = await fetch(`${apiUrl}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'EntreTormentas-Publisher',
      },
    });

    if (checkRes.ok) {
      const data = await checkRes.json();
      existingSha = data.sha;
    }
  } catch (err) {
    // If check fails with 404, file is new
  }

  const base64Content = Buffer.from(fileContent, 'utf8').toString('base64');
  const commitMessage = existingSha
    ? `feat(news): update "${article.title}" via newsroom`
    : `feat(news): publish "${article.title}" via newsroom`;

  const putBody: Record<string, any> = {
    message: commitMessage,
    content: base64Content,
    branch,
  };

  if (existingSha) {
    putBody.sha = existingSha;
  }

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'EntreTormentas-Publisher',
    },
    body: JSON.stringify(putBody),
  });

  if (!putRes.ok) {
    const errorData = await putRes.json().catch(() => ({}));
    throw new Error(`GitHub API Error: ${errorData.message || putRes.statusText}`);
  }

  const resultData = await putRes.json();

  return {
    success: true,
    slug,
    path: filePath,
    commitSha: resultData.commit?.sha,
    commitUrl: resultData.commit?.html_url,
  };
}
