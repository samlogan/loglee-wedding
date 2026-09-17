import type { MetadataRoute } from 'next';

import getSitemap from '@/tools/helpers/getSitemap';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { raw: sitemap } = await getSitemap();
  return sitemap;
}
