import { getEntry } from 'astro:content';

export type AdPlacement = 'header' | 'home' | 'category' | 'article-top' | 'article-bottom';

export interface SiteSettings {
  logo?: string;
  favicon?: string;
  headerBackground?: string;
  headerBackgroundOpacity: number;
}

export interface Ad {
  name: string;
  placement: AdPlacement;
  image?: string;
  href?: string;
  alt?: string;
  startDate?: string;
  endDate?: string;
  enabled: boolean;
}

// Reads build-time bundled Content Layer entries (100% compatible with both Cloudflare Workers V8 and Vercel Node SSR).
export async function getSiteSettings(): Promise<SiteSettings> {
  const defaults: SiteSettings = { headerBackgroundOpacity: 80 };
  try {
    const entry = await getEntry('settings', 'site');
    const data = entry?.data;
    if (!data) return defaults;
    return {
      logo: data.logo || undefined,
      favicon: data.favicon || undefined,
      headerBackground: data.headerBackground || undefined,
      headerBackgroundOpacity: data.headerBackgroundOpacity ?? 80,
    };
  } catch {
    return defaults;
  }
}

export async function getActiveAd(placement: AdPlacement, now: Date = new Date()): Promise<Ad | undefined> {
  try {
    const entry = await getEntry('settings', 'ads');
    const data = entry?.data;
    const today = now.toISOString().slice(0, 10);
    const items = (data?.items ?? []) as unknown as Ad[];
    return items.find((ad) => {
      if (ad.placement !== placement || !ad.enabled || !ad.image) return false;
      const start = ad.startDate ? String(ad.startDate).slice(0, 10) : undefined;
      const end = ad.endDate ? String(ad.endDate).slice(0, 10) : undefined;
      if (start && today < start) return false;
      if (end && today > end) return false;
      return true;
    });
  } catch {
    return undefined;
  }
}
