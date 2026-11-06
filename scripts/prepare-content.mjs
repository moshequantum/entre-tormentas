// Decide qué noticias entran en cada build.
//   BUILD_SCOPE=live    → año en curso + las 300 más recientes (se recompila en cada commit)
//   BUILD_SCOPE=archive → todo lo anterior al 1 de enero del año en curso (se compila 1 vez al año)
// ARCHIVE_YEAR permite fijar el año de corte (por defecto, el año actual UTC).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const SCOPE = process.env.BUILD_SCOPE === 'archive' ? 'archive' : 'live';
const KEEP_RECENT = 300;
const YEAR = Number(process.env.ARCHIVE_YEAR) || new Date().getUTCFullYear();
const CUTOFF = Date.UTC(YEAR, 0, 1);

const POSTS_DIR = path.resolve('src/content/posts');
const ARCHIVE_FILE = path.resolve('src/archive/posts-archive.json.gz');
const OUT_DIR = path.resolve('generated/posts');

const ts = (content) => {
  const m = content.match(/^publishedAt:\s*['"]?([^'"\r\n]+)['"]?/m);
  const t = m ? Date.parse(m[1].trim()) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

// Todas las notas: archivo comprimido + .md versionados (los .md ganan si se repiten).
const all = new Map();
if (fs.existsSync(ARCHIVE_FILE)) {
  const map = JSON.parse(zlib.gunzipSync(fs.readFileSync(ARCHIVE_FILE)).toString('utf-8'));
  for (const [file, content] of Object.entries(map)) all.set(file, { content, tracked: false });
}
for (const file of fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))) {
  all.set(file, { content: fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8'), tracked: true });
}

const entries = [...all.entries()].map(([file, v]) => ({ file, ...v, ts: ts(v.content) }));
entries.sort((a, b) => b.ts - a.ts);
const recent = new Set(entries.slice(0, KEEP_RECENT).map((e) => e.file));

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

let written = 0;
let total = 0;
for (const e of entries) {
  const live = e.ts >= CUTOFF || recent.has(e.file);
  if (SCOPE === 'live') {
    if (!live) continue;
    total++;
    if (e.tracked) continue; // ya lo lee el loader desde src/content/posts
  } else {
    if (e.ts >= CUTOFF) continue;
    total++;
  }
  fs.writeFileSync(path.join(OUT_DIR, e.file), e.content);
  written++;
}

console.log(
  `[prepare-content] scope=${SCOPE} corte=${YEAR}-01-01 → ${total} notas en el build (${written} extraídas a generated/posts) de ${entries.length} totales.`
);
