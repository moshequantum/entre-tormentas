import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const POSTS_DIR = path.resolve('src/content/posts');
const ARCHIVE_FILE = path.resolve('src/archive/posts-archive.json.gz');

if (!fs.existsSync(ARCHIVE_FILE)) {
  console.log('No posts-archive.json.gz found, skipping unpack.');
  process.exit(0);
}

fs.mkdirSync(POSTS_DIR, { recursive: true });
const compressed = fs.readFileSync(ARCHIVE_FILE);
const archiveMap = JSON.parse(zlib.gunzipSync(compressed).toString('utf-8'));

let written = 0;
for (const [file, content] of Object.entries(archiveMap)) {
  const targetPath = path.join(POSTS_DIR, file);
  // Do not overwrite if a newer version exists in src/content/posts
  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, content, 'utf-8');
    written++;
  }
}

console.log(`Unpacked ${written} historical posts into src/content/posts for build.`);
