import { stegaClean } from '@sanity/client/stega';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import PlayerShowcase from '@/components/PlayerShowcase';
import type { PlayerShowcasePlayer, PlayerShowcaseRosterEntry } from '@/components/PlayerShowcase';
import website from '@/config/website';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { PLAYER_PAGE_QUERY } from '@/tools/sanity/lib/queries.groq';

/**
 * The players that have a page: one static route file each under `app/(frontend)`, and the only
 * slugs `PLAYER_PAGE_QUERY` admits to the roster. A player created in the Studio with any other slug
 * has no route, so it is kept out of the pager and can never become a switch target that 404s.
 * Adding a player is a route file plus an entry here.
 */
export const PLAYER_SLUGS = ['sam', 'lauren'] as const;

export type PlayerSlug = (typeof PLAYER_SLUGS)[number];

/** A root projection and a `*[…]` filter never return `null`, so only the player can be missing. */
interface PlayerPageData {
  player: PlayerShowcasePlayer | null;
  roster: PlayerShowcaseRosterEntry[];
}

/**
 * Tagged `player` so an edit to either player document revalidates both routes — see the `player`
 * branch in `app/api/revalidate/route.ts`. Without it the type fell through to the default, which
 * revalidates the `page` tag and not this one, and the static player pages stayed stale until the
 * next deploy.
 */
const fetchPlayerPage = (slug: PlayerSlug) =>
  sanityFetch<PlayerPageData>({
    params: { routes: [...PLAYER_SLUGS], slug },
    query: PLAYER_PAGE_QUERY,
    tags: ['player']
  });

interface PlayerTemplateProps {
  /** The player document's slug, which is also the route segment. */
  slug: PlayerSlug;
}

/**
 * `/sam` and `/lauren`, from one template.
 *
 * Each route is two static files that differ only in the slug they pass here. The ticket is explicit
 * that this must not be a dynamic `[player]` segment: a dynamic segment at this level outranks the
 * `[...slug]` catch-all and would swallow every CMS page on the site.
 */
const PlayerTemplate = async (props: PlayerTemplateProps) => {
  const { slug } = props;
  const { player, roster } = await fetchPlayerPage(slug);

  if (!player) {
    notFound();
  }

  return <PlayerShowcase player={player} roster={roster} />;
};

/**
 * Titles the page after the player, and keeps it out of search — the site is private, so every
 * page is `noindex`, matching `app/(frontend)/thank-you`.
 *
 * The name is `stegaClean`ed: in draft mode `sanityFetch` stega-encodes plain strings, and a
 * `<title>` would carry the invisible payload into the tab and the history entry.
 */
export const generatePlayerMetadata = async (slug: PlayerSlug): Promise<Metadata> => {
  const { player } = await fetchPlayerPage(slug);
  const name = stegaClean(player?.name)?.trim();

  return {
    robots: { follow: true, index: false },
    title: name ? `${name} | ${website.title}` : website.title
  };
};

export default PlayerTemplate;
