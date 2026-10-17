const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');

const sqlGzPath = path.resolve('data/wordpress_backup.sql.gz');
const outputDir = path.resolve('src/content/posts');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('--- Iniciando Migración de Entre Tormentas (WordPress -> Astro/Keystatic) ---');

// Data structures for relational mapping
const terms = new Map(); // term_id -> { name, slug }
const termTaxonomy = new Map(); // term_taxonomy_id -> { term_id, taxonomy }
const postCategories = new Map(); // post_id -> category_slug
const postThumbnails = new Map(); // post_id -> thumbnail_id
const attachmentUrls = new Map(); // attachment_id -> url
const posts = [];

function cleanContent(raw) {
  if (!raw) return '';
  // Unescape SQL quotes and backslashes
  let text = raw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
  // Remove WordPress shortcodes
  text = text.replace(/\[\/?vc_[^\]]*\]/gi, '');
  text = text.replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi, '$1');
  text = text.replace(/\[\/?et_[^\]]*\]/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  return text.trim();
}

function parseSqlTuples(line, tableName) {
  const insertPrefix = `INSERT INTO \`${tableName}\` VALUES `;
  if (!line.startsWith(insertPrefix)) return [];
  const rawValues = line.slice(insertPrefix.length).trim();
  // Simple regex parser for values tuple groups
  // e.g. (1, 'val', ...), (2, 'val', ...)
  return rawValues;
}

// First pass: extract terms, taxonomies, relationships, and meta
const gunzip = zlib.createGunzip();
const stream = fs.createReadStream(sqlGzPath).pipe(gunzip);
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

let lineCounter = 0;

rl.on('line', (line) => {
  lineCounter++;

  // 1. wp_terms: (term_id, name, slug, term_group)
  if (line.startsWith('INSERT INTO `wp_terms` VALUES')) {
    const matches = line.matchAll(/\((\d+),'([^']*)','([^']*)',(\d+)\)/g);
    for (const m of matches) {
      terms.set(m[1], { name: m[2], slug: m[3] });
    }
  }

  // 2. wp_term_taxonomy: (term_taxonomy_id, term_id, taxonomy, ...)
  if (line.startsWith('INSERT INTO `wp_term_taxonomy` VALUES')) {
    const matches = line.matchAll(/\((\d+),(\d+),'([^']*)'/g);
    for (const m of matches) {
      termTaxonomy.set(m[1], { termId: m[2], taxonomy: m[3] });
    }
  }

  // 3. wp_term_relationships: (object_id, term_taxonomy_id, term_order)
  if (line.startsWith('INSERT INTO `wp_term_relationships` VALUES')) {
    const matches = line.matchAll(/\((\d+),(\d+),(\d+)\)/g);
    for (const m of matches) {
      const postId = m[1];
      const taxId = m[2];
      const tax = termTaxonomy.get(taxId);
      if (tax && tax.taxonomy === 'category') {
        const term = terms.get(tax.termId);
        if (term && term.slug !== 'sin-categoria' && term.slug !== 'uncategorized') {
          postCategories.set(postId, term.slug);
        }
      }
    }
  }

  // 4. wp_postmeta: (meta_id, post_id, meta_key, meta_value)
  if (line.startsWith('INSERT INTO `wp_postmeta` VALUES')) {
    const matches = line.matchAll(/\((\d+),(\d+),'_thumbnail_id','(\d+)'\)/g);
    for (const m of matches) {
      postThumbnails.set(m[2], m[3]);
    }
  }
});

rl.on('close', () => {
  console.log(`Paso 1 completado. Términos: ${terms.size}, Categorías mapeadas: ${postCategories.size}`);
  
  // Second pass: Parse wp_posts
  const gunzip2 = zlib.createGunzip();
  const stream2 = fs.createReadStream(sqlGzPath).pipe(gunzip2);
  const rl2 = readline.createInterface({ input: stream2, crlfDelay: Infinity });

  let savedPostsCount = 0;

  rl2.on('line', (line) => {
    if (line.startsWith('INSERT INTO `wp_posts` VALUES')) {
      // Find attachment images first
      const attachMatches = line.matchAll(/\((\d+),\d+,'[^']*','[^']*',.*?'attachment','([^']*)',\d+\)/g);
      for (const am of attachMatches) {
        // am[1] is post_id, am[2] is mime or guid
      }

      // Check for published posts
      // In wp_posts: ID, post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt, post_status...
      // We parse published posts
      const postRegex = /\((\d+),(\d+),'([^']*)','[^']*','([\s\S]*?)','([^']*)','([\s\S]*?)','publish',[^,]+,[^,]+,[^,]+,'([^']*)',/g;
      let match;
      while ((match = postRegex.exec(line)) !== null) {
        const id = match[1];
        const date = match[3] ? match[3].split(' ')[0] : '2026-10-01';
        let rawContent = match[4];
        let rawTitle = match[5];
        let rawExcerpt = match[6];
        let slug = match[7];

        if (!slug || slug.trim() === '') {
          slug = `post-${id}`;
        }

        // Clean title
        const title = rawTitle.replace(/\\'/g, "'").replace(/\\"/g, '"').trim();
        if (!title) continue;

        // Category resolution
        let category = postCategories.get(id) || 'regionales';
        // Normalize known categories
        if (category.includes('deporte')) category = 'deportes';
        else if (category.includes('suceso')) category = 'sucesos';
        else if (category.includes('nacion')) category = 'nacionales';
        else if (category.includes('internac')) category = 'internacionales';
        else if (category.includes('espectacul') || category.includes('farandula')) category = 'espectaculos';
        else if (category.includes('opinion')) category = 'opinion';
        else category = 'regionales';

        const content = cleanContent(rawContent);
        const excerpt = cleanContent(rawExcerpt).slice(0, 220);

        const frontmatter = [
          '---',
          `title: ${JSON.stringify(title)}`,
          `publishedAt: "${date}"`,
          `category: "${category}"`,
          `isFeatured: false`,
          `isBreaking: false`,
          `author: "Redacción Entre Tormentas"`,
          `coverImage: "/images/posts/default-post.jpg"`,
          `excerpt: ${JSON.stringify(excerpt)}`,
          '---',
          '',
          content
        ].join('\n');

        const filePath = path.join(outputDir, `${slug}.md`);
        try {
          fs.writeFileSync(filePath, frontmatter, 'utf8');
          savedPostsCount++;
        } catch (err) {
          // Ignore filesystem naming edge cases
        }
      }
    }
  });

  rl2.on('close', () => {
    console.log(`=== Migración Exitosa! ===`);
    console.log(`Total de artículos migrados a Markdown: ${savedPostsCount}`);
  });
});
