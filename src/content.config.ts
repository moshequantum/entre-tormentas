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
