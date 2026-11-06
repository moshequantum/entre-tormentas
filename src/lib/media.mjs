// Las imágenes de WordPress viven en R2 (bucket `entretormentas-media`,
// dominio `media.entretormentas.com`), convertidas a .webp con la misma ruta
// AAAA/MM/nombre. Reescribimos las URLs viejas en build para que el navegador
// vaya directo al CDN de R2 sin pasar por el Worker.
export const MEDIA_BASE = 'https://media.entretormentas.com';

const WP_UPLOADS = /^(?:https?:\/\/(?:www\.)?entretormentas\.com)?\/wp-content\/uploads\/(.+?)(?:\.(?:jpe?g|png|gif|jfif|webp|bmp))?(\?.*)?$/i;

export function mediaUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const m = url.trim().match(WP_UPLOADS);
  if (!m) return url;
  return `${MEDIA_BASE}/${m[1]}.webp`;
}

// Plugin remark: reescribe imágenes y HTML embebido dentro del cuerpo de las notas.
export function remarkWpMedia() {
  const HTML_WP = /(?:https?:\/\/(?:www\.)?entretormentas\.com)?\/wp-content\/uploads\/[^"'\s)>]+/gi;
  const walk = (node) => {
    if (node.type === 'image' && node.url) node.url = mediaUrl(node.url);
    if (node.type === 'link' && node.url) node.url = mediaUrl(node.url);
    if (node.type === 'html' && node.value) node.value = node.value.replace(HTML_WP, (u) => mediaUrl(u));
    if (node.children) node.children.forEach(walk);
  };
  return (tree) => walk(tree);
}
