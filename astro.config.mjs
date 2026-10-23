import { existsSync } from 'node:fs';
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
    // Keystatic singletons are read from disk at request time by SSR pages.
    // @astrojs/vercel no expande globs en includeFiles y falla con ENOENT si la
    // ruta no existe (los singletons se crean en el repo al primer guardado en
    // /keystatic), así que solo incluimos los yaml que ya estén en el repo.
    includeFiles: ['./src/content/settings/site.yaml', './src/content/settings/ads.yaml'].filter((file) =>
      existsSync(new URL(file, import.meta.url))
    ),
    isr: {
      expiration: 600,
      // `exclude` acepta strings que se comparan por igualdad exacta contra
      // route.pattern (p. ej. '/api/auth/login'), o RegExp que sí se evalúan
      // contra cada patrón. Los strings con sintaxis regex ('/api/(.*)') nunca
      // coincidían, así que todos los endpoints dinámicos quedaban cacheados en
      // el ISR de Vercel: servían respuestas ajenas a los POST y devolvían
      // FUNCTION_INVOCATION_FAILED en texto plano en vez de JSON.
      exclude: [/^\/api\//, /^\/admin/, /^\/login$/, /^\/keystatic/],
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
