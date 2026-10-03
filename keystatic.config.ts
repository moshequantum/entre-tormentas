import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: import.meta.env.PROD ? 'github' : 'local',
    ...(import.meta.env.PROD && {
      repo: {
        owner: 'moshequantum',
        name: 'entre-tormentas',
      },
    }),
  },
  collections: {
    posts: collection({
      label: 'Noticias',
      slugField: 'title',
      path: 'src/content/posts/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Título' } }),
        publishedAt: fields.date({
          label: 'Fecha de publicación',
          defaultValue: { kind: 'today' },
        }),
        category: fields.select({
          label: 'Categoría',
          options: [
            { label: 'Regionales (Zulia)', value: 'regionales' },
            { label: 'Nacionales', value: 'nacionales' },
            { label: 'Sucesos', value: 'sucesos' },
            { label: 'Deportes', value: 'deportes' },
            { label: 'Internacionales', value: 'internacionales' },
            { label: 'Espectáculos', value: 'espectaculos' },
            { label: 'Opinión', value: 'opinion' },
          ],
          defaultValue: 'regionales',
        }),
        isFeatured: fields.checkbox({
          label: '¿Noticia Destacada en Portada?',
          defaultValue: false,
        }),
        isBreaking: fields.checkbox({
          label: '¿Última Hora / Alerta Urgente?',
          defaultValue: false,
        }),
        author: fields.text({
          label: 'Autor / Periodista',
          defaultValue: 'Redacción Entre Tormentas',
        }),
        coverImage: fields.image({
          label: 'Imagen de Portada',
          directory: 'public/images/posts',
          publicPath: '/images/posts/',
        }),
        excerpt: fields.text({
          label: 'Bajada / Extracto',
          multiline: true,
        }),
        content: fields.markdoc({
          label: 'Cuerpo de la Noticia',
          options: {
            image: {
              directory: 'public/images/posts',
              publicPath: '/images/posts/',
            },
          },
        }),
      },
    }),
  },
});
