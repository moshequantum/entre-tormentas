import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

export type AdPlacement = 'header' | 'home' | 'category' | 'article-top' | 'article-bottom';

export interface SiteSettings {
  logo?: string;
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

// Reads local files at build/SSR time, regardless of the Keystatic storage kind.
const reader = createReader(process.cwd(), keystaticConfig);

export async function getSiteSettings(): Promise<SiteSettings> {
  const defaults: SiteSettings = { headerBackgroundOpacity: 20 };
  try {
    const data = await reader.singletons.siteSettings.read();
    if (!data) return defaults;
    return {
      logo: data.logo || undefined,
      headerBackground: data.headerBackground || undefined,
      headerBackgroundOpacity: data.headerBackgroundOpacity ?? 20,
    };
  } catch {
    return defaults;
  }
}

export async function getActiveAd(placement: AdPlacement, now: Date = new Date()): Promise<Ad | undefined> {
  try {
    const data = await reader.singletons.ads.read();
    const today = now.toISOString().slice(0, 10);
    const items = (data?.items ?? []) as unknown as Ad[];
    return items.find((ad) => {
      if (ad.placement !== placement || !ad.enabled || !ad.image) return false;
      if (ad.startDate && today < ad.startDate) return false;
      if (ad.endDate && today > ad.endDate) return false;
      return true;
    });
  } catch {
    return undefined;
  }
}
