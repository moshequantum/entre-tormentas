import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
  storage: {
    kind: import.meta.env.PROD ? 'github' : 'local',
    ...(import.meta.env.PROD && {
      repo: {
        owner: 'moshequantum',
        name: 'entre-tormentas',
      },
      branchPrefix: 'main',
    }),
  },
  collections: {
    posts: collection({
      label: 'Noticias',
      slugField: 'title',
      path: 'src/content/posts/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({
          name: {
            label: 'Título',
            description: 'Titular de la noticia (obligatorio, entre 5 y 150 caracteres).',
            validation: {
              isRequired: true,
              length: { min: 5, max: 150 },
            },
          },
          slug: {
            label: 'Identificador URL (Slug)',
            description: 'Generado automáticamente. Máximo 80 caracteres (solo minúsculas, números y guiones).',
            generate: (title) => {
              return title
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 80)
                .replace(/-+$/, '');
            },
            validation: {
              length: { min: 3, max: 80 },
              pattern: {
                regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                message: 'El slug solo puede contener letras minúsculas sin acentos, números y guiones simples.',
              },
            },
          },
        }),
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
        imageCaption: fields.text({
          label: 'Pie de foto / Crédito de imagen (opcional)',
        }),
        excerpt: fields.text({
          label: 'Bajada / Extracto (Resumen para portada y redes)',
          multiline: true,
        }),
        tags: fields.array(
          fields.text({ label: 'Etiqueta / Tema SEO' }),
          {
            label: 'Etiquetas SEO (Palabras clave de la noticia)',
            description: 'Ej: Maracaibo, Blanca Mármol de León, Zulia, Política',
            itemLabel: (props) => props.value || 'Nueva etiqueta',
          }
        ),
        content: fields.markdoc({
          label: 'Cuerpo de la Noticia',
          // fields.markdoc() guarda por defecto en `.mdoc`, pero todo el archivo
          // vivo (9.319 notas) y el glob de Astro son `.md`: sin esto Keystatic
          // contaba 0 entradas y publicaba notas que el sitio nunca recogía.
          extension: 'md',
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
        favicon: fields.image({
          label: 'Favicon del sitio',
          description: 'Opcional. Icono de la pestaña (SVG, PNG o ICO). Si está vacío se usa /favicon.svg.',
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
