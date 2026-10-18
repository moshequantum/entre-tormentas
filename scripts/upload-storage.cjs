const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

// Auto-load .env if present
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...values] = trimmed.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = process.env[key.trim()] || values.join('=').trim();
    }
  }
}

// Configure S3 Client (compatible with Cloudflare R2, InsForge S3, and AWS S3)
const endpoint = process.env.S3_ENDPOINT; // e.g. https://<account_id>.r2.cloudflarestorage.com or InsForge S3 endpoint
const bucket = process.env.S3_BUCKET || 'entretormentas-media';
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const region = process.env.S3_REGION || 'auto';

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error('ERROR: Missing S3 environment variables.');
  console.log('Please provide:');
  console.log('  S3_ENDPOINT (e.g. https://<account-id>.r2.cloudflarestorage.com)');
  console.log('  S3_BUCKET (e.g. entretormentas-media)');
  console.log('  S3_ACCESS_KEY_ID');
  console.log('  S3_SECRET_ACCESS_KEY');
  process.exit(1);
}

const s3 = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const tempExtractDir = path.resolve('temp_uploads_extracted');

async function extractArchive() {
  if (!fs.existsSync(tempExtractDir)) {
    fs.mkdirSync(tempExtractDir, { recursive: true });
  }

  console.log('--- Paso 1: Descomprimiendo uploads_originals.tar.gz ---');
  return new Promise((resolve, reject) => {
    const tar = spawn('tar', ['-xzf', path.resolve('data/uploads_originals.tar.gz'), '-C', tempExtractDir]);
    tar.on('close', code => {
      if (code === 0) {
        console.log('Descompresión completada.');
        resolve();
      } else {
        reject(new Error(`Tar exited with code ${code}`));
      }
    });
    tar.on('error', reject);
  });
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function getContentType(filePath) {
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.gif')) return 'image/gif';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

async function uploadFiles() {
  console.log('\n--- Paso 2: Escaneando archivos para subir a Object Storage ---');
  const allFiles = getAllFiles(tempExtractDir);
  console.log(`Total de archivos encontrados: ${allFiles.length}`);

  let uploaded = 0;
  let skipped = 0;
  const CONCURRENCY = 25;
  let activePromises = [];

  for (let i = 0; i < allFiles.length; i++) {
    const filePath = allFiles[i];
    const relativeKey = path.relative(tempExtractDir, filePath).replace(/\\/g, '/');
    const contentType = getContentType(filePath);

    const task = (async () => {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        
        // Subir archivo original (ej: 2024/08/foto.jpg.webp)
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: relativeKey,
            Body: fileBuffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
          })
        );

        // Si el archivo termina en .jpg.webp o .png.webp, subir también alias sin .webp
        // para compatibilidad directa con las URLs originales de WordPress
        if (/\.(jpe?g|png)\.webp$/i.test(relativeKey)) {
          const aliasKey = relativeKey.replace(/\.webp$/i, '');
          await s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: aliasKey,
              Body: fileBuffer,
              ContentType: 'image/webp',
              CacheControl: 'public, max-age=31536000, immutable',
            })
          );
        }

        uploaded++;
        if (uploaded % 500 === 0 || uploaded === allFiles.length) {
          console.log(`Progreso: [${uploaded}/${allFiles.length}] archivos subidos con éxito...`);
        }
      } catch (err) {
        console.error(`Error subiendo ${relativeKey}:`, err.message);
      }
    })();

    activePromises.push(task);

    if (activePromises.length >= CONCURRENCY) {
      await Promise.race(activePromises);
      activePromises = activePromises.filter(p => p !== task);
    }
  }

  await Promise.all(activePromises);
  console.log(`\n=== CARGA COMPLETA: ${uploaded} archivos subidos exitosamente a ${bucket} ===`);
}

async function main() {
  await extractArchive();
  await uploadFiles();
}

main().catch(console.error);
