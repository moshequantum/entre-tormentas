const fs = require('fs');
const path = require('path');

const postsDir = path.resolve('src/content/posts');
const files = fs.readdirSync(postsDir);
const categories = {};
let latestDate = '';
let oldestDate = '9999-99-99';

for (const f of files) {
  const content = fs.readFileSync(path.join(postsDir, f), 'utf8');
  const catMatch = content.match(/category:\s*"([^"]+)"/);
  const dateMatch = content.match(/publishedAt:\s*"([^"]+)"/);
  
  if (catMatch) {
    const cat = catMatch[1];
    categories[cat] = (categories[cat] || 0) + 1;
  }
  if (dateMatch) {
    const d = dateMatch[1];
    if (d > latestDate) latestDate = d;
    if (d < oldestDate) oldestDate = d;
  }
}

console.log('--- REPORTE DE ARCHIVO MIGRADO ---');
console.log('Total artículos:', files.length);
console.log('Fecha más reciente:', latestDate);
console.log('Fecha más antigua:', oldestDate);
console.log('Desglose por categoría:', categories);
