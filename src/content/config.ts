import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    publishedAt: z.string().or(z.date()).optional(),
    category: z.string().default('regionales'),
    isFeatured: z.boolean().default(false),
    isBreaking: z.boolean().default(false),
    author: z.string().default('Redacción Entre Tormentas'),
    coverImage: z.string().optional(),
    excerpt: z.string().optional(),
  }),
});

export const collections = {
  posts,
};
