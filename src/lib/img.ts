// Imágenes responsivas sin servicio de pago: `scripts/optimize-images.mjs` genera en el
// build variantes WebP de cada imagen bajo /images/ (`<original>.w<ancho>.webp`) y este
// helper arma `src` + `srcset` + `sizes`. Las URLs externas (R2, ya en .webp) pasan tal cual.
export const VARIANT_WIDTHS = [160, 480, 960, 1600] as const;

type Preset = 'thumb' | 'card' | 'hero' | 'full';

const PRESETS: Record<Preset, { widths: number[]; sizes: string; fallback: number }> = {
  thumb: { widths: [160], sizes: '80px', fallback: 160 },
  card: { widths: [480, 960], sizes: '(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw', fallback: 480 },
  hero: { widths: [480, 960, 1600], sizes: '(min-width: 1024px) 66vw, 100vw', fallback: 960 },
  full: { widths: [480, 960, 1600], sizes: '100vw', fallback: 960 },
};

const OPTIMIZABLE = /^\/images\/.+\.(jpe?g|png|jfif|webp)$/i;

export function isOptimizable(src?: string | null): boolean {
  return Boolean(src && OPTIMIZABLE.test(src) && !/\.w\d+\.webp$/i.test(src));
}

const variant = (src: string, width: number) => encodeURI(`${src}.w${width}.webp`);

/** Atributos para <img>: `<img {...img(src, 'card')} alt="…" />`. */
export function img(src: string | null | undefined, preset: Preset = 'card') {
  const value = src || '/images/posts/default-post.jpg';
  if (!isOptimizable(value)) return { src: value };
  const p = PRESETS[preset];
  return {
    src: variant(value, p.fallback),
    srcset: p.widths.map((w) => `${variant(value, w)} ${w}w`).join(', '),
    sizes: p.sizes,
  };
}

/** Si una variante falla, vuelve a la imagen por defecto sin quedar atrapado en el srcset. */
export const IMG_FALLBACK = "this.onerror=null;this.removeAttribute('srcset');this.src='/images/posts/default-post.jpg'";
