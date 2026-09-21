/**
 * Revalidation API Route
 *
 * The Sanity webhook calls this on every published create, update and delete. It wipes the whole
 * site's cache rather than working out which pages a document touches.
 *
 * ## Why everything, every time
 *
 * This used to branch per document type — a page revalidated its own path, a player two tags,
 * header and wedding settings `revalidatePath('/', 'layout')` — and the settings branches silently
 * did nothing on Netlify. Two reasons, both about stale data being re-cached rather than cleared:
 *
 * - The layout's header, socials and wedding-settings reads were untagged, so no tag reached them,
 *   and `revalidatePath('/', 'layout')` alone let the rebuilt pages keep the old responses.
 * - `revalidateTag(tag, 'max')` is stale-while-revalidate: it marks data stale and lets the next
 *   render *use* it while a fresh copy loads in the background. A page rebuilt in that window is
 *   rebuilt from the old data, and Netlify then stores that page for a year.
 *
 * Now every published read carries `SANITY_CACHE_TAG` (see `sanityFetch`), and it is expired with
 * `{ expire: 0 }`, which Next documents as the setting for invalidation from an external webhook:
 * stale content is never served, and the next request waits for fresh data. `revalidatePath('/',
 * 'layout')` then drops every rendered page, so each is rebuilt on its next visit.
 *
 * The site is a handful of pages. Rebuilding all of them after an edit costs a few extra Sanity
 * queries; getting the dependency map wrong costs an edit that never appears, which is the bug this
 * replaced. Every document type now behaves the same, so a new type needs no change here.
 *
 * ## Redirects are the exception
 *
 * `settings` holds the redirects, and `next.config.js` reads those at build time, so no cache wipe
 * can apply them — a `settings` change also triggers a Netlify build via `NETLIFY_BUILD_HOOK_URL`.
 *
 * The webhook must point at `/api/revalidate/`, with the trailing slash — without it the site
 * answers 308 and the redirected request loses its body.
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/revalidateTag
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { SANITY_CACHE_TAG } from '@/tools/sanity/lib/fetch';

import { validateWebhookAuth } from '../_helpers/auth';

const logPrefix = '[🔖 Revalidate]: ';

interface Payload {
  _type?: string;
}

export const POST = async (req: NextRequest) => {
  const authError = validateWebhookAuth(req);
  if (authError) {
    return authError;
  }

  try {
    const data: Payload = await req.json();
    const type = data?._type;

    // An uploaded image or file changes nothing until a document references it, and that document's
    // own publish arrives as its own webhook.
    if (type === 'sanity.imageAsset' || type === 'sanity.fileAsset') {
      console.log(`${logPrefix}Skipping asset change.`);
      return NextResponse.json({ revalidated: true });
    }

    revalidateTag(SANITY_CACHE_TAG, { expire: 0 });
    revalidatePath('/', 'layout');
    console.log(`${logPrefix}"${type}" changed. All Sanity data and every page have been revalidated.`);

    if (type === 'settings') {
      const buildHookUrl = process.env.NETLIFY_BUILD_HOOK_URL;
      if (!buildHookUrl) {
        console.error(
          `${logPrefix}Redirects changed but NETLIFY_BUILD_HOOK_URL is not set, so no build was triggered.`
        );
        return NextResponse.json({ error: 'Build hook URL not set.', revalidated: true });
      }
      await fetch(buildHookUrl, { method: 'POST' });
      console.log(`${logPrefix}Redirects changed. Netlify build triggered.`);
    }

    return NextResponse.json({ revalidated: true });
  } catch (error) {
    console.error(`${logPrefix}An error occurred while revalidating.`, error);
    return NextResponse.json({ error: 'Internal server error', revalidated: false });
  }
};
