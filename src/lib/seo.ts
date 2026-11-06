import fs from 'node:fs';
import path from 'node:path';
import { mediaUrl } from './media.mjs';

export const BASE_URL = 'https://www.entretormentas.com';
export const SITE_NAME = 'Entre Tormentas';
export const SITE_DESCRIPTION =
  'Diario digital de Maracaibo: noticias del estado Zulia y Venezuela — regionales, nacionales, sucesos, deportes, espectáculos y opinión.';
export const CATEGORIES = [
  'regionales',
  'nacionales',
  'sucesos',
  'deportes',
  'internacionales',
  'espectaculos',
  'opinion',
] as const;

export const CATEGORY_NAMES: Record<string, string> = {
  regionales: 'Regionales (Zulia)',
  nacionales: 'Nacionales',
  sucesos: 'Sucesos',
  deportes: 'Deportes',
  internacionales: 'Internacionales',
  espectaculos: 'Espectáculos',
  opinion: 'Opinión',
};

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function isoDate(value?: string | Date | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function absoluteUrl(url?: string | null): string {
  if (!url) return '';
  const resolved = mediaUrl(url) as string;
  if (resolved.startsWith('http')) return resolved;
  return `${BASE_URL}${resolved.startsWith('/') ? '' : '/'}${resolved}`;
}

export interface ArchivedPost {
  slug: string;
  date: string;
  title: string;
  cover: string;
}

/** Notas que viven en el Worker de archivo (índice generado por scripts/prepare-content.mjs). */
export function loadArchiveIndex(): ArchivedPost[] {
  const file = path.resolve('generated/archive-index.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as ArchivedPost[];
}

export function textResponse(body: string, contentType = 'application/xml; charset=utf-8'): Response {
  return new Response(body, { status: 200, headers: { 'Content-Type': contentType } });
}
