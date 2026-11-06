// Construye el archivo histórico (todo lo anterior al 1 de enero del año en curso)
// en dist-archive/ y deja solo lo que el Worker de archivo necesita servir.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const env = { ...process.env, BUILD_SCOPE: 'archive' };
execSync('node scripts/prepare-content.mjs', { stdio: 'inherit', env });
execSync('npx astro build --outDir dist-archive', { stdio: 'inherit', env });

const out = path.resolve('dist-archive');
const keep = new Set(['noticias', '_astro', 'images']);
for (const entry of fs.readdirSync(out)) {
  if (!keep.has(entry)) fs.rmSync(path.join(out, entry), { recursive: true, force: true });
}
// El listado y la paginación del archivo no se exponen: solo las notas.
fs.rmSync(path.join(out, 'noticias', 'index.html'), { force: true });
fs.rmSync(path.join(out, 'noticias', 'pagina'), { recursive: true, force: true });
// Las imágenes de public/ ya las sirve el build vivo.
fs.rmSync(path.join(out, 'images'), { recursive: true, force: true });

let files = 0;
const count = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? count(path.join(d, e.name)) : files++; };
count(out);
console.log(`[build-archive] dist-archive listo: ${files} archivos (límite free: 20.000).`);
