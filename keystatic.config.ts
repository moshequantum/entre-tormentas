import { config, fields, collection, singleton } from '@keystatic/core';

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
  singletons: {
    siteSettings: singleton({
      label: 'Ajustes del sitio',
      path: 'src/content/settings/site',
      format: 'yaml',
      schema: {
        logo: fields.image({
          label: 'Logo del sitio',
          description: 'Opcional. Si está vacío se usa el isologo por defecto.',
          directory: 'public/images/site',
          publicPath: '/images/site/',
        }),
        headerBackground: fields.image({
          label: 'Imagen de fondo del encabezado',
          description: 'Opcional. Se muestra detrás del contenido del encabezado.',
          directory: 'public/images/site',
          publicPath: '/images/site/',
        }),
        headerBackgroundOpacity: fields.integer({
          label: 'Opacidad del fondo del encabezado (0-100)',
          defaultValue: 20,
          validation: { min: 0, max: 100 },
        }),
      },
    }),
    ads: singleton({
      label: 'Anuncios',
      path: 'src/content/settings/ads',
      format: 'yaml',
      schema: {
        items: fields.array(
          fields.object({
            name: fields.text({ label: 'Nombre del anunciante' }),
            placement: fields.select({
              label: 'Ubicación',
              options: [
                { label: 'Encabezado', value: 'header' },
                { label: 'Portada', value: 'home' },
                { label: 'Categoría', value: 'category' },
                { label: 'Noticia (arriba)', value: 'article-top' },
                { label: 'Noticia (dentro del texto)', value: 'article-bottom' },
              ],
              defaultValue: 'header',
            }),
            image: fields.image({
              label: 'Imagen del anuncio',
              directory: 'public/images/ads',
              publicPath: '/images/ads/',
            }),
            href: fields.url({ label: 'Enlace de destino' }),
            alt: fields.text({ label: 'Texto alternativo' }),
            startDate: fields.date({ label: 'Fecha de inicio (opcional)' }),
            endDate: fields.date({ label: 'Fecha de fin (opcional)' }),
            enabled: fields.checkbox({ label: 'Activo', defaultValue: true }),
          }),
          {
            label: 'Anuncios',
            itemLabel: (props) => props.fields.name.value || 'Anuncio sin nombre',
          }
        ),
      },
    }),
  },
});
