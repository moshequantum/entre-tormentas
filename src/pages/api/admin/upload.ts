export const prerender = false;

import type { APIRoute } from 'astro';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// R2 Storage Configuration
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'https://62680f607b64e56109f6d9fbbd26abf7.r2.cloudflarestorage.com';
const S3_BUCKET = process.env.S3_BUCKET || 'entretormentas-media';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || '6cfaa30e73f38db3045c815c38b4c89a';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || 'd33c2e204bf732285a1727dc4a7eb6780f52200f03a0125df231d26aae532a45';
const S3_REGION = process.env.S3_REGION || 'auto';
const MEDIA_CDN_URL = process.env.MEDIA_CDN_URL || 'https://pub-3f0739ef09bb45a78025f47b36c2f0cc.r2.dev';

const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

function sanitizeFileName(name: string): string {
  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex !== -1 ? name.substring(0, dotIndex) : name;
  const ext = dotIndex !== -1 ? name.substring(dotIndex + 1).toLowerCase() : 'jpg';

  const cleanBase = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'imagen';

  return `${cleanBase}.${ext}`;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionToken =
      cookies.get('entretormentas_session')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'No autorizado. Iniciá sesión para subir imágenes.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return new Response(
        JSON.stringify({ error: 'Petición inválida. Se esperaba multipart/form-data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'No se envió ningún archivo de imagen válido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return new Response(
        JSON.stringify({
          error: `Tipo de archivo no permitido (${file.type}). Solo se admiten JPG, PNG, WebP, GIF y AVIF.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return new Response(
        JSON.stringify({ error: 'La imagen excede el límite permitido de 15 MB.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    const safeName = sanitizeFileName(file.name);
    const key = `${year}/${month}/${timestamp}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const cdnBase = MEDIA_CDN_URL.replace(/\/+$/, '');
    const publicUrl = `${cdnBase}/${key}`;
    const proxyUrl = `https://entretormentas.com/wp-content/uploads/${key}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        proxyUrl,
        key,
        fileName: safeName,
        size: file.size,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error al subir imagen a Cloudflare R2:', err);
    return new Response(
      JSON.stringify({
        error: err.message || 'Error interno al procesar la subida a Cloudflare R2.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
