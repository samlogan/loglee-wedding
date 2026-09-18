/**
 * Revalidation API Route
 *
 * This endpoint handles on-demand revalidation for content changes from your CMS.
 * It's triggered via webhooks when content is updated, ensuring your site stays fresh
 * without full rebuilds.
 *
 * ## How It Works
 *
 * Next.js caching works with tags and paths:
 * - `revalidateTag()`: Invalidates all cached data associated with a specific tag
 * - `revalidatePath()`: Invalidates a specific path or all paths when used with 'layout'
 *
 * ## Adding New Content Types
 *
 * When adding a new content type (e.g., 'caseStudy'), consider:
 *
 * 1. **If the content appears on multiple pages:**
 *    Use `revalidateTag()` to invalidate all pages that might display it.
 *
 *    Example for Case Studies that appear on homepage, archive, and detail pages:
 *    ```
 *    if (type === 'caseStudy') {
 *      await revalidateTag('caseStudy');  // Tag all queries fetching case studies
 *      await revalidateTag('page', 'max');        // Revalidate pages that might include them
 *      return NextResponse.json({ revalidated: true });
 *    }
 *    ```
 *
 * 2. **If the content is page-specific:**
 *    Use `revalidatePath()` for the specific route.
 *
 *    Example:
 *    ```
 *    if (type === 'teamMember') {
 *      await revalidatePath('/about/team');
 *      return NextResponse.json({ revalidated: true });
 *    }
 *    ```
 *
 * 3. **For global elements (header/footer):**
 *    Use `revalidatePath('/', 'layout')` to revalidate all pages efficiently.
 *
 * ## Important Notes
 *
 * - Always tag your fetch requests in your components with appropriate cache tags
 * - Use multiple tags when content appears in multiple contexts
 * - The 'page' tag is a catch-all for general page content
 * - Consider performance: revalidating everything is expensive, be selective
 *
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating
 */

import { revalidateTag, revalidatePath } from 'next/cache';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { validateWebhookAuth } from '../_helpers/auth';

const logPrefix = '[🔖 Revalidate Tag]: ';

interface Payload {
  slug: {
    current: string;
  };
  _type: string;
}

export const POST = async (req: NextRequest) => {
  const authError = validateWebhookAuth(req);
  if (authError) {
    return authError;
  }

  try {
    const data: Payload = await req.json();
    const type = data?._type;
    const slug = data?.slug?.current;

    console.log(`${logPrefix}Revalidating tag for type: ${type}, slug: ${slug}`);

    // Skip revalidating for images and files (this includes videos)
    if (type === 'sanity.imageAsset' || type === 'sanity.fileAsset') {
      console.log(`${logPrefix}Skipping image or file update.`);
      return NextResponse.json({ revalidated: true });
    }

    // if page revalidate the path provided
    if (type === 'page') {
      const path = slug === 'home' ? '/' : `/${slug}`;
      await revalidatePath(path);
      console.log(`${logPrefix}Path "${path}" has been successfully revalidated.`);
      return NextResponse.json({ revalidated: true });
    }

    // if settings trigger a build hook in case they've added redirects
    if (type === 'settings') {
      const buildHookUrl = process.env.NETLIFY_BUILD_HOOK_URL; // contains redirects and other settings so we need to do a full rebuild
      console.log(`${logPrefix}Settings changed. Triggering site rebuild.`);
      if (!buildHookUrl) {
        console.error(`${logPrefix}Netlify build hook URL is not set.`);
        return NextResponse.json({ error: 'Build hook URL not set.', revalidated: false });
      }
      await fetch(buildHookUrl, {
        method: 'GET'
      });
      console.log(`${logPrefix}Website build hook has been triggered.`);
      return NextResponse.json({ revalidated: true });
    }

    // if headerDocument revalidate everything but not the build hook
    if (type === 'headerDocument') {
      await revalidatePath('/', 'layout');
      console.log(`${logPrefix}Header changed. Root path with layout has been successfully revalidated.`);
      return NextResponse.json({ revalidated: true });
    }

    // the header's reply-by line reads weddingSettings, so the layout has to come back too
    if (type === 'weddingSettings') {
      await revalidatePath('/', 'layout');
      await revalidateTag('page', 'max');
      console.log(`${logPrefix}Wedding settings changed. Layout and page tag have been successfully revalidated.`);
      return NextResponse.json({ revalidated: true });
    }

    /*
     * The footer's social icons. `components/Layout` fetches `SOCIAL_MEDIA_QUERY` alongside the
     * header and the wedding singleton and hands the result to `Footer`, so this is a layout
     * element and needs the same treatment they get.
     *
     * Without this branch the type fell through to the default below, which revalidates the `page`
     * tag and *not* the layout — so an editor who changed a social link saw the old one in the
     * footer until some unrelated header or settings edit happened to bring the layout back. It
     * also logged the change as an `Unknown type` error, which is the sort of noise that trains
     * people to ignore the log.
     */
    if (type === 'socialMediaDocument') {
      await revalidatePath('/', 'layout');
      console.log(`${logPrefix}Social media changed. Root path with layout has been successfully revalidated.`);
      return NextResponse.json({ revalidated: true });
    }

    /*
     * Players are read in two places, under two different tags, and a player edit must reach both.
     *
     * - `player` — the `/sam` and `/lauren` routes. `templates/PlayerTemplate` tags its fetch `player`,
     *   and both routes read the whole roster: the pager counts it and the switch control links to
     *   the next player, so an edit to either document changes both pages.
     * - `page` — any CMS page whose sections join player documents into their projection. Those are
     *   fetched as part of the page's own `DOCUMENT_QUERY`, which is tagged `page`, not `player`. The
     *   home page's player-select section does exactly this: `*[_type == 'player']`.
     *
     * Refreshing only `player` was a regression. Before this branch existed, a player edit fell through
     * to the default below, which refreshes `page` — so a section reading players was covered by
     * accident, and adding a `player`-only branch silently took that away. Both tags are refreshed so
     * the coverage no longer depends on where a player happens to be read from.
     *
     * The brief's success criteria say players must be editable without a redeploy, on every page
     * that shows them.
     */
    if (type === 'player') {
      await revalidateTag('player', 'max');
      await revalidateTag('page', 'max');
      console.log(`${logPrefix}Player changed. Tags "player" and "page" have been successfully revalidated.`);
      return NextResponse.json({ revalidated: true });
    }

    /*
     * No `footerDocument` branch. The document is gone: `components/Footer` renders the header's own
     * `navItems`, the date and venue from `weddingSettings`, and the icons from
     * `socialMediaDocument` — so the three branches above are between them the whole of the footer.
     */
    // Default case - revalidate page tag
    console.error(`${logPrefix}Unknown type "${type}". Defaulting to "page" tag`, { slug, type });
    await revalidateTag('page', 'max');
    return NextResponse.json({ revalidated: true });
  } catch (error) {
    console.error(`${logPrefix}An error occured while revalidating a tag.`, error);
    return NextResponse.json({ error: 'Internal server error', revalidated: false });
  }
};
