import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const POSTS_DIR = path.resolve('src/content/posts');
const ARCHIVE_FILE = path.resolve('src/archive/posts-archive.json.gz');
const KEEP_RECENT_COUNT = 500;

function extractPublishedTimestamp(content, filename) {
  const match = content.match(/^publishedAt:\s*['"]?([^'"\r\n]+)['"]?/m);
  if (match) {
    const ts = Date.parse(match[1].trim());
    if (!Number.isNaN(ts)) return ts;
  }
  return 0;
}

const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
console.log(`Found ${files.length} markdown files in src/content/posts`);

if (files.length <= KEEP_RECENT_COUNT) {
  console.log(`File count (${files.length}) is already <= ${KEEP_RECENT_COUNT}. Nothing to pack.`);
  process.exit(0);
}

// Load existing archive if present so we merge rather than overwrite
let archiveMap = {};
if (fs.existsSync(ARCHIVE_FILE)) {
  const compressed = fs.readFileSync(ARCHIVE_FILE);
  archiveMap = JSON.parse(zlib.gunzipSync(compressed).toString('utf-8'));
}

const entries = files.map((file) => {
  const fullPath = path.join(POSTS_DIR, file);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const ts = extractPublishedTimestamp(content, file);
  return { file, fullPath, content, ts };
});

// Sort newest first
entries.sort((a, b) => b.ts - a.ts);

const toKeep = entries.slice(0, KEEP_RECENT_COUNT);
const toArchive = entries.slice(KEEP_RECENT_COUNT);

for (const item of toArchive) {
  archiveMap[item.file] = item.content;
}

fs.mkdirSync(path.dirname(ARCHIVE_FILE), { recursive: true });
const jsonBuffer = Buffer.from(JSON.stringify(archiveMap), 'utf-8');
const gzipped = zlib.gzipSync(jsonBuffer, { level: 9 });
fs.writeFileSync(ARCHIVE_FILE, gzipped);

// Remove archived files from src/content/posts so file count stays below 5,000
for (const item of toArchive) {
  fs.unlinkSync(item.fullPath);
}

console.log(
  `Packed ${Object.keys(archiveMap).length} historical posts into ${ARCHIVE_FILE} (${(
    gzipped.length /
    (1024 * 1024)
  ).toFixed(2)} MB). Kept ${toKeep.length} newest .md files in src/content/posts.`
);
