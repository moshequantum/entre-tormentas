// Genera variantes WebP (160/480/960/1600 px) de cada imagen raster bajo <dir>/images.
// Uso: node scripts/optimize-images.mjs [dist]
// Las variantes se guardan en .image-cache/ por hash de contenido, así que en CI
// (con actions/cache) solo se procesan las imágenes nuevas que suba Keystatic.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.argv[2] || 'dist', 'images');
const CACHE = path.resolve('.image-cache');
const WIDTHS = [160, 480, 960, 1600];
const RASTER = /\.(jpe?g|png|jfif|webp)$/i;
const VARIANT = /\.w\d+\.webp$/i;

if (!fs.existsSync(ROOT)) {
  console.log(`[optimize-images] ${ROOT} no existe, nada que hacer.`);
  process.exit(0);
}
fs.mkdirSync(CACHE, { recursive: true });

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (RASTER.test(e.name) && !VARIANT.test(e.name)) files.push(full);
  }
};
walk(ROOT);

let generated = 0;
let cached = 0;
let failed = 0;
const started = Date.now();

for (const file of files) {
  const buffer = fs.readFileSync(file);
  const hash = crypto.createHash('sha1').update(buffer).digest('hex');
  for (const width of WIDTHS) {
    const target = `${file}.w${width}.webp`;
    const cacheFile = path.join(CACHE, `${hash}.w${width}.webp`);
    try {
      if (!fs.existsSync(cacheFile)) {
        await sharp(buffer, { failOn: 'none' })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: width <= 160 ? 60 : 72, effort: 4 })
          .toFile(cacheFile);
        generated++;
      } else {
        cached++;
      }
      fs.copyFileSync(cacheFile, target);
    } catch (error) {
      failed++;
      // Si la imagen está corrupta, el <img> cae al fallback por onerror.
      console.warn(`[optimize-images] no se pudo procesar ${path.relative(ROOT, file)} (${width}px): ${error.message}`);
      break;
    }
  }
}

console.log(
  `[optimize-images] ${files.length} imágenes → ${generated} variantes nuevas, ${cached} desde caché, ${failed} fallidas (${(
    (Date.now() - started) /
    1000
  ).toFixed(1)} s).`
);
