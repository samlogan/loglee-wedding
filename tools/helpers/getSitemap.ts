import type { MetadataRoute } from 'next';
import type { SanityDocument } from 'next-sanity';

import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { SITEMAP_QUERY } from '@/tools/sanity/lib/queries.groq';

const fileBasedRoutes: string[] = ['/sitemap/html/']; // These might also be stored in the `route` document already

const getSitemap = async (): Promise<{
  raw: MetadataRoute.Sitemap;
  grouped: Record<string, MetadataRoute.Sitemap>;
}> => {
  const pathnames = await sanityFetch<SanityDocument>({
    query: SITEMAP_QUERY
  });

  type SitemapItemWithType = MetadataRoute.Sitemap[number] & { type: string };

  // First, create items with type for grouping purposes
  const itemsWithType = pathnames.reduce((acc: SitemapItemWithType[], cur: SanityDocument) => {
    const { _updatedAt, _type, pathname } = cur;

    acc.push({
      changeFrequency: 'weekly',
      lastModified: _updatedAt,
      priority: 0.7,
      type: _type,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}${pathname === '/home/' ? '/' : pathname}`
    });

    return acc;
  }, []);

  fileBasedRoutes.forEach((route) => {
    itemsWithType.push({
      changeFrequency: 'weekly',
      lastModified: new Date().toISOString(),
      priority: 0.7,
      type: 'file-based',
      url: `${process.env.NEXT_PUBLIC_SITE_URL}${route}`
    });
  });

  // Group items by type and remove the type field
  const groupedItems = itemsWithType.reduce(
    (acc: Record<string, MetadataRoute.Sitemap>, item: SitemapItemWithType) => {
      const { type, ...itemWithoutType } = item;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(itemWithoutType);
      return acc;
    },
    {} as Record<string, MetadataRoute.Sitemap>
  );

  // Create raw items without the type field
  const items = itemsWithType.map(
    ({ type: _type, ...rest }: { type: string; [key: string]: any }) => rest
  ) as MetadataRoute.Sitemap;

  return { grouped: groupedItems, raw: items };
};

export default getSitemap;
