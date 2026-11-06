import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { mediaUrl } from './lib/media.mjs';

// BUILD_SCOPE=live (por defecto): notas versionadas en src/content/posts + las
//   del año en curso / 300 más recientes que `scripts/prepare-content.mjs`
//   extrae del archivo comprimido a generated/posts.
// BUILD_SCOPE=archive: solo generated/posts (el histórico), se construye una vez
//   al año y se publica en el Worker `entre-tormentas-archivo`.
const scope = process.env.BUILD_SCOPE === 'archive' ? 'archive' : 'live';
const postPatterns =
  scope === 'archive' ? ['generated/posts/*.md'] : ['src/content/posts/*.md', 'generated/posts/*.md'];

const posts = defineCollection({
  loader: glob({
    pattern: postPatterns,
    base: '.',
    generateId: ({ entry }) => entry.split('/').pop()!.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    publishedAt: z.string().or(z.date()).optional(),
    category: z.string().default('regionales'),
    isFeatured: z.boolean().default(false),
    isBreaking: z.boolean().default(false),
    author: z.string().default('Redacción Entre Tormentas'),
    coverImage: z.string().optional().transform((v) => mediaUrl(v)),
    imageCaption: z.string().optional(),
    excerpt: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    status: z.enum(['published', 'draft', 'review', 'trash']).default('published'),
  }),
});

const settings = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/settings' }),
  schema: z
    .object({
      logo: z.string().nullable().optional(),
      favicon: z.string().nullable().optional(),
      headerBackground: z.string().nullable().optional(),
      headerBackgroundOpacity: z.number().optional(),
      items: z
        .array(
          z.object({
            name: z.string(),
            placement: z.enum(['header', 'home', 'category', 'article-top', 'article-bottom']),
            image: z.string().nullable().optional(),
            href: z.string().nullable().optional(),
            alt: z.string().nullable().optional(),
            startDate: z.string().or(z.date()).nullable().optional(),
            endDate: z.string().or(z.date()).nullable().optional(),
            enabled: z.boolean().default(true),
          })
        )
        .optional(),
    })
    .passthrough(),
});

export const collections = {
  posts,
  settings,
};
