import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.entretormentas.com',
  output: 'static',
  security: {
    checkOrigin: false,
    allowedDomains: [
      { hostname: 'www.entretormentas.com', protocol: 'https' },
      { hostname: 'entretormentas.com', protocol: 'https' },
    ],
  },
  adapter: vercel({
    isr: {
      expiration: 600,
      exclude: ['/api/(.*)', '/admin', '/login', '/keystatic(.*)'],
    },
  }),
  env: {
    schema: {
      KEYSTATIC_GITHUB_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      KEYSTATIC_GITHUB_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      KEYSTATIC_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      GITHUB_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      INSFORGE_BASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      INSFORGE_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      INSFORGE_SERVICE_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      MEDIA_CDN_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
    }
  },
  integrations: [
    react(),
    keystatic(),
    tailwind({
      applyBaseStyles: false,
    })
  ],
  vite: {
    optimizeDeps: {
      exclude: ['astro:env/server'],
      esbuildOptions: {
        external: ['astro:env/server']
      }
    }
  }
});
