import type { ClientPerspective, QueryParams } from 'next-sanity';
import { draftMode } from 'next/headers';

import { client } from './client';
import { token } from './token';

/** The cache tag every published Sanity read carries. Expiring it refreshes all Sanity content at once. */
export const SANITY_CACHE_TAG = 'sanity';

/**
 * Used to fetch data in Server Components, it has built in support for handling Draft Mode and perspectives.
 * When using the "published" perspective the response is cached by Next.js under its tags and refreshed on demand by the
 * `/api/revalidate/` webhook. It is fetched from the live API, not the CDN — see the note on `useCdn` below.
 * When using the "drafts" perspective then the data is fetched from the live API and isn't cached, it will also fetch draft content that isn't published yet.
 */
export async function sanityFetch<QueryResponse>({
  query,
  tags = [],
  params = {}
}: {
  query: string;
  tags?: string[];
  params?: QueryParams;
}) {
  const { isEnabled } = await draftMode();
  const perspective: Omit<ClientPerspective, 'raw'> = isEnabled ? 'drafts' : 'published';

  /**
   * Stega embedded Content Source Maps are used by Visual Editing by both the Sanity Presentation Tool and Vercel Visual Editing.
   * The Sanity Presentation Tool will enable Draft Mode when loading up the live preview, and we use it as a signal for when to embed source maps.
   * When outside of the Sanity Studio we also support the Vercel Toolbar Visual Editing feature, which is only enabled in production when it's a Vercel Preview Deployment.
   */
  const stega: boolean = perspective === 'drafts' || process.env.VERCEL_ENV === 'preview';

  if (perspective === 'drafts' || process.env.NODE_ENV === 'development') {
    return client.fetch<QueryResponse>(query, params, {
      stega,
      perspective: 'drafts',
      // The token is required to fetch draft content
      token,
      // The `drafts` perspective isn't available on the API CDN
      useCdn: false,
      // And we can't cache the responses as it would slow down the live preview experience
      next: { revalidate: 0 }
    });
  }

  return client.fetch<QueryResponse>(query, params, {
    stega,
    perspective: 'published',
    /*
     * The live API, not the CDN. Next's data cache is the cache here: a tagged response is kept until
     * the webhook revalidates its tag, so Sanity is only asked again after an edit. That refetch runs
     * the moment the webhook lands, and Sanity's API CDN can still hold the pre-edit result for a
     * short while after a mutation — so through the CDN, Next could re-cache the stale content and
     * keep serving it until the next edit. The live API is current as soon as the mutation commits.
     *
     * This replaces the `/api/revalidate/queue` route, which delayed the revalidation 60s via QStash
     * to wait the CDN out. Sanity's Next.js guide recommends the same: CDN off for webhook-driven
     * revalidation and anywhere guaranteed-fresh data is needed.
     */
    useCdn: false,
    // Only enable Stega in production if it's a Vercel Preview Deployment, as the Vercel Toolbar supports Visual Editing
    /*
     * `SANITY_CACHE_TAG` on every published read, on top of the caller's own. It is the handle the
     * revalidate webhook pulls: one tag that reaches every cached Sanity response, including the
     * layout's header, socials and wedding-settings reads, which were fetched untagged and so could
     * only be reached through `revalidatePath` — which did not reliably expire them.
     */
    next: { tags: [SANITY_CACHE_TAG, ...tags] }
  });
}
