const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');
const path = require('path');

const gzPath = path.resolve('data/wordpress_backup.sql.gz');
const postsDir = path.resolve('src/content/posts');

async function main() {
  console.log('--- Verificando SQL Backup vs Posts Migrados ---');

  const gunzip = zlib.createGunzip();
  const stream = fs.createReadStream(gzPath).pipe(gunzip);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let totalPostsInSql = 0;
  let publishPostsInSql = 0;
  let postTypes = {};
  let postStatuses = {};
  let latestSqlPost = null;
  let earliestSqlPost = null;

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `wp_posts` VALUES')) {
      // Let's parse rows using regex matching WordPress post rows
      // wp_posts schema typical: (ID, post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt, post_status, comment_status, ping_status, post_password, post_name, to_ping, pinged, post_modified, post_modified_gmt, post_content_filtered, post_parent, guid, menu_order, post_type, post_mime_type, comment_count)
      // Since post_content can be tricky with quotes, let's look at post_type and post_status
      // We can match: ,'publish',...,'post',
      const matches = line.matchAll(/\((\d+),(\d+),'([^']*)',.*?,'(publish|draft|inherit|trash|auto-draft|future|private)',[^,]+,[^,]+,[^,]+,'([^']*)',[^,]+,[^,]+,'([^']*)',[^,]+,[^,]+,\d+,'[^']*',\d+,'([a-zA-Z0-9_-]+)'/g);
      
      for (const m of matches) {
        const id = m[1];
        const postDate = m[3];
        const status = m[4];
        const slug = m[5];
        const modifiedDate = m[6];
        const postType = m[7];

        postTypes[postType] = (postTypes[postType] || 0) + 1;
        postStatuses[status] = (postStatuses[status] || 0) + 1;

        if (postType === 'post' && status === 'publish') {
          publishPostsInSql++;
          if (!latestSqlPost || postDate > latestSqlPost.date) {
            latestSqlPost = { id, date: postDate, slug };
          }
          if (!earliestSqlPost || postDate < earliestSqlPost.date) {
            earliestSqlPost = { id, date: postDate, slug };
          }
        }
      }
    }
  }

  console.log('\nResumen en SQL Backup:');
  console.log('Tipos de post:', postTypes);
  console.log('Estados de post:', postStatuses);
  console.log('Total posts tipo "post" y estado "publish":', publishPostsInSql);
  if (latestSqlPost) console.log('Noticia más reciente en SQL:', latestSqlPost);
  if (earliestSqlPost) console.log('Noticia más antigua en SQL:', earliestSqlPost);

  // Now check files in src/content/posts
  const mdFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  console.log('\nArchivos Markdown en src/content/posts:', mdFiles.length);

  // Sample check dates in markdown files
  let latestMdDate = '';
  let earliestMdDate = '9999-99-99';
  let samplePosts = [];

  for (let i = 0; i < mdFiles.length; i++) {
    const file = mdFiles[i];
    // Check first 100 or all files dates
    if (i % 500 === 0 || i === mdFiles.length - 1) {
      const content = fs.readFileSync(path.join(postsDir, file), 'utf8');
      const dateMatch = content.match(/publishedAt:\s*["']?([^"'\n]+)/);
      if (dateMatch) {
        samplePosts.push({ file, date: dateMatch[1] });
      }
    }
  }

  console.log('Muestra de fechas en posts migrados:', samplePosts.slice(0, 5));
}

main().catch(console.error);
