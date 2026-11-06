import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';
import { remarkWpMedia } from './src/lib/media.mjs';

// Todo el portal se genera estático. El Worker solo ejecuta Keystatic
// (/keystatic, /api/keystatic/*) y la redirección de URLs heredadas de WordPress.
export default defineConfig({
  site: 'https://www.entretormentas.com',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  security: {
    checkOrigin: false,
    allowedDomains: [
      { hostname: 'www.entretormentas.com', protocol: 'https' },
      { hostname: 'entretormentas.com', protocol: 'https' },
      { hostname: '**.workers.dev', protocol: 'https' },
    ],
  },
  adapter: cloudflare({
    imageService: 'passthrough',
    platformProxy: { enabled: false },
  }),
  markdown: {
    remarkPlugins: [remarkWpMedia],
  },
  env: {
    schema: {
      KEYSTATIC_GITHUB_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      KEYSTATIC_GITHUB_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      KEYSTATIC_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  integrations: [
    react(),
    keystatic(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    optimizeDeps: {
      exclude: ['astro:env/server'],
      esbuildOptions: {
        external: ['astro:env/server'],
      },
    },
  },
});
