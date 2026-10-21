import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    publishedAt: z.string().or(z.date()).optional(),
    category: z.string().default('regionales'),
    isFeatured: z.boolean().default(false),
    isBreaking: z.boolean().default(false),
    author: z.string().default('Redacción Entre Tormentas'),
    coverImage: z.string().optional(),
    excerpt: z.string().optional(),
    status: z.enum(['published', 'draft', 'review', 'trash']).default('published'),
  }),
});

export const collections = {
  posts,
};
