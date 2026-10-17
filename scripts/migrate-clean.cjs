const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');

const sqlGzPath = path.resolve('data/wordpress_backup.sql.gz');
const outputDir = path.resolve('src/content/posts');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('--- Iniciando Migración Limpia y Fidedigna de Entre Tormentas ---');

const terms = new Map(); // term_id -> { name, slug }
const termTaxonomy = new Map(); // term_taxonomy_id -> { term_id, taxonomy }
const postCategories = new Map(); // post_id -> category_slug
const postThumbnails = new Map(); // post_id -> thumbnail_id
const attachmentUrls = new Map(); // attachment_id -> url

function parseSqlTuples(line, prefix) {
  if (!line.startsWith(prefix)) return [];
  const str = line.slice(prefix.length);
  const rows = [];
  let inRow = false;
  let inStr = false;
  let escape = false;
  let currentField = '';
  let fields = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escape) {
      if (ch === 'n') currentField += '\n';
      else if (ch === 'r') currentField += '\r';
      else if (ch === 't') currentField += '\t';
      else if (ch === '0') currentField += '\0';
      else currentField += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === "'" && !escape) {
      inStr = !inStr;
      continue;
    }
    if (!inStr) {
      if (ch === '(' && !inRow) {
        inRow = true;
        fields = [];
        currentField = '';
        continue;
      }
      if (ch === ',' && inRow) {
        fields.push(currentField);
        currentField = '';
        continue;
      }
      if (ch === ')' && inRow) {
        fields.push(currentField);
        inRow = false;
        rows.push(fields);
        fields = [];
        currentField = '';
        continue;
      }
    }
    if (inRow) {
      currentField += ch;
    }
  }
  return rows;
}

function cleanHtmlToMarkdown(html) {
  if (!html) return '';
  let text = html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Strip WordPress Gutenberg comments
  text = text.replace(/<!--\s*\/?wp:[^>]*-->/g, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Strip shortcodes
  text = text.replace(/\[\/?vc_[^\]]*\]/gi, '');
  text = text.replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi, '$1');
  text = text.replace(/\[\/?et_[^\]]*\]/gi, '');

  // Convert basic HTML
  text = text.replace(/<p[^>]*>/gi, '\n\n').replace(/<\/p>/gi, '');
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');
  text = text.replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  text = text.replace(/<img\s+[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![]($1)');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Remove other HTML tags
  text = text.replace(/<\/?[^>]+(>|$)/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8217;/g, '’')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&hellip;/g, '…');

  // Collapse multiple blank lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

function cleanExcerpt(raw, content) {
  if (raw && raw.trim()) {
    const cleaned = cleanHtmlToMarkdown(raw).replace(/[*_#`[\]()]/g, '').slice(0, 240).replace(/\s+/g, ' ').trim();
    if (cleaned.length > 5) return cleaned;
  }
  if (content && content.trim()) {
    const paras = content
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p && !p.startsWith('#') && !p.startsWith('![]') && !p.startsWith('***'));
    const firstPara = paras[0] || '';
    return firstPara.replace(/[*_#`[\]()]/g, '').slice(0, 240).replace(/\s+/g, ' ').trim();
  }
  return '';
}

async function run() {
  console.log('Paso 1: Extrayendo términos, taxonomías y relaciones...');
  const gunzip1 = zlib.createGunzip();
  const stream1 = fs.createReadStream(sqlGzPath).pipe(gunzip1);
  const rl1 = readline.createInterface({ input: stream1, crlfDelay: Infinity });

  const rawRelationships = [];

  for await (const line of rl1) {
    if (line.startsWith('INSERT INTO `wp_terms` VALUES')) {
      const rows = parseSqlTuples(line, 'INSERT INTO `wp_terms` VALUES ');
      for (const r of rows) {
        terms.set(r[0], { name: r[1], slug: r[2] });
      }
    } else if (line.startsWith('INSERT INTO `wp_term_taxonomy` VALUES')) {
      const rows = parseSqlTuples(line, 'INSERT INTO `wp_term_taxonomy` VALUES ');
      for (const r of rows) {
        termTaxonomy.set(r[0], { termId: r[1], taxonomy: r[2] });
      }
    } else if (line.startsWith('INSERT INTO `wp_term_relationships` VALUES')) {
      const rows = parseSqlTuples(line, 'INSERT INTO `wp_term_relationships` VALUES ');
      for (const r of rows) {
        rawRelationships.push([r[0], r[1]]);
      }
    } else if (line.startsWith('INSERT INTO `wp_postmeta` VALUES')) {
      const rows = parseSqlTuples(line, 'INSERT INTO `wp_postmeta` VALUES ');
      for (const r of rows) {
        if (r[2] === '_thumbnail_id') {
          postThumbnails.set(r[1], r[3]);
        }
      }
    }
  }

  // Resolver categorías después de que terms y termTaxonomy están cargados
  for (const [postId, taxId] of rawRelationships) {
    const tax = termTaxonomy.get(taxId);
    if (tax && tax.taxonomy === 'category') {
      const term = terms.get(tax.termId);
      if (term && term.slug !== 'sin-categoria' && term.slug !== 'uncategorized') {
        postCategories.set(postId, term.slug);
      }
    }
  }

  console.log(`Términos: ${terms.size}, Categorías asociadas: ${postCategories.size}, Thumbnails mapeados: ${postThumbnails.size}`);

  console.log('\nPaso 2: Extrayendo adjuntos y noticias publicadas...');
  const gunzip2 = zlib.createGunzip();
  const stream2 = fs.createReadStream(sqlGzPath).pipe(gunzip2);
  const rl2 = readline.createInterface({ input: stream2, crlfDelay: Infinity });

  let publishedPosts = [];

  for await (const line of rl2) {
    if (line.startsWith('INSERT INTO `wp_posts` VALUES')) {
      const rows = parseSqlTuples(line, 'INSERT INTO `wp_posts` VALUES ');
      for (const r of rows) {
        const id = r[0];
        const type = r[20];
        const guid = r[18];

        if (type === 'attachment' && guid) {
          attachmentUrls.set(id, guid);
        } else if (type === 'post' && r[7] === 'publish') {
          publishedPosts.push(r);
        }
      }
    }
  }

  console.log(`Imágenes adjuntas detectadas: ${attachmentUrls.size}`);
  console.log(`Noticias válidas para migrar: ${publishedPosts.length}`);

  // Limpiar carpeta previa para no dejar archivos corruptos de attachment
  const existingFiles = fs.readdirSync(outputDir);
  console.log(`Limpiando ${existingFiles.length} archivos antiguos en ${outputDir}...`);
  for (const f of existingFiles) {
    fs.unlinkSync(path.join(outputDir, f));
  }

  console.log('\nPaso 3: Generando archivos Markdown reales...');
  let savedCount = 0;

  for (const r of publishedPosts) {
    const id = r[0];
    const rawDate = r[2] || '2026-10-01 00:00:00';
    const date = rawDate.split(' ')[0];
    const rawContent = r[4] || '';
    let title = (r[5] || '').replace(/\\'/g, "'").replace(/\\"/g, '"').trim();
    let slug = (r[11] || '').trim();

    if (!slug) slug = `post-${id}`;
    if (!title) title = `Noticia ${id}`;

    // Resolver categoría
    let category = postCategories.get(id) || 'regionales';
    if (category.includes('deporte')) category = 'deportes';
    else if (category.includes('suceso')) category = 'sucesos';
    else if (category.includes('nacion')) category = 'nacionales';
    else if (category.includes('internac')) category = 'internacionales';
    else if (category.includes('espectacul') || category.includes('farandula')) category = 'espectaculos';
    else if (category.includes('opinion')) category = 'opinion';
    else category = 'regionales';

    // Resolver imagen de portada
    let coverImage = '/images/posts/default-post.jpg';
    const thumbId = postThumbnails.get(id);
    if (thumbId && attachmentUrls.has(thumbId)) {
      coverImage = attachmentUrls.get(thumbId);
    }

    const content = cleanHtmlToMarkdown(rawContent);
    const excerpt = cleanExcerpt(r[6], content);

    const frontmatter = [
      '---',
      `title: ${JSON.stringify(title)}`,
      `publishedAt: "${date}"`,
      `category: "${category}"`,
      `isFeatured: false`,
      `isBreaking: false`,
      `author: "Redacción Entre Tormentas"`,
      `coverImage: ${JSON.stringify(coverImage)}`,
      `excerpt: ${JSON.stringify(excerpt)}`,
      '---',
      '',
      content
    ].join('\n');

    // Sanitizar nombre de archivo en Windows
    const safeSlug = slug.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 180);
    const filePath = path.join(outputDir, `${safeSlug}.md`);

    try {
      fs.writeFileSync(filePath, frontmatter, 'utf8');
      savedCount++;
    } catch (e) {
      // Intento fallback si el slug tiene colisión o carácter raro
      try {
        fs.writeFileSync(path.join(outputDir, `post-${id}.md`), frontmatter, 'utf8');
        savedCount++;
      } catch (err) {}
    }
  }

  console.log(`\n=== MIGRACIÓN LIMPIA COMPLETADA ===`);
  console.log(`Total de artículos Markdown generados con éxito: ${savedCount}`);
}

run().catch(console.error);
