import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import PlayerShowcase from '@/components/PlayerShowcase';
import type { PlayerShowcasePlayer, PlayerShowcaseRosterEntry } from '@/components/PlayerShowcase';
import Section from '@/components/Section';
import website from '@/config/website';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { PLAYER_PAGE_QUERY } from '@/tools/sanity/lib/queries.groq';

interface PlayerPageData {
  player: PlayerShowcasePlayer | null;
  roster: PlayerShowcaseRosterEntry[] | null;
}

/**
 * Tagged `player` so an edit to either player document revalidates both routes — see the `player`
 * branch in `app/api/revalidate/route.ts`. Without it the type fell through to the default, which
 * revalidates the `page` tag and not this one, and the static player pages stayed stale until the
 * next deploy.
 */
const fetchPlayerPage = (slug: string) =>
  sanityFetch<PlayerPageData | null>({
    params: { slug },
    query: PLAYER_PAGE_QUERY,
    tags: ['player']
  });

interface PlayerTemplateProps {
  /** The player document's slug, which is also the route segment. */
  slug: string;
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
  const data = await fetchPlayerPage(slug);

  if (!data?.player) {
    notFound();
  }

  return (
    <Section containerWidth="xl" name="player" removeTopSpacing spacing="md" theme="light">
      <PlayerShowcase player={data.player} roster={data.roster ?? []} />
    </Section>
  );
};

/**
 * Titles the page after the player, and keeps it out of search — the site is private, so every
 * page is `noindex`, matching `app/(frontend)/thank-you`.
 */
export const generatePlayerMetadata = async (slug: string): Promise<Metadata> => {
  const data = await fetchPlayerPage(slug);
  const name = data?.player?.name?.trim();

  return {
    robots: { follow: true, index: false },
    title: name ? `${name} | ${website.title}` : website.title
  };
};

export default PlayerTemplate;
