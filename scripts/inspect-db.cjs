const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');

const gzPath = 'data/wordpress_backup.sql.gz';
if (!fs.existsSync(gzPath)) {
  console.log('File not found:', gzPath);
  process.exit(1);
}

const gunzip = zlib.createGunzip();
const stream = fs.createReadStream(gzPath).pipe(gunzip);
const rl = readline.createInterface({ input: stream });

let tables = [];
let postInsertLines = 0;
let lineCount = 0;

rl.on('line', (line) => {
  lineCount++;
  if (line.startsWith('CREATE TABLE')) {
    const parts = line.split('`');
    if (parts.length > 1) {
      tables.push(parts[1]);
    }
  }
  if (line.includes('INSERT INTO') && line.includes('posts')) {
    postInsertLines++;
  }
});

rl.on('close', () => {
  console.log('Total SQL lines inspected:', lineCount);
  console.log('Tables found in backup:', tables);
  console.log('Lines with wp_posts inserts:', postInsertLines);
});
