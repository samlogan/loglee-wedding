import { stegaClean } from '@sanity/client/stega';

import hasText from '@/helpers/hasText';
import type { IPlayerSelectSectionPlayer } from '@/tools/sanity/schema/sections/playerSelectSection';

/**
 * A player that can be a card: it has a name for the chip and the link's name, and a path to link to.
 *
 * Narrower than the projection's type, which has to allow either to be missing — a draft can hold a
 * player created a minute ago with neither. The card takes only this, so a caller that has not been
 * through `isSelectablePlayer` cannot compile a card with `href="//"` or a link named "Play as ".
 */
export type SelectablePlayer = IPlayerSelectSectionPlayer & { name: string; slug: { current: string } };

/**
 * The player page's path segment: the slug with any stega payload and any stray slashes removed, or
 * `''` when nothing is left.
 *
 * The slashes matter because the Studio's slugify only runs on "Generate": a slug typed as `/sam` is
 * storable, and `//sam/` is a protocol-relative URL to a host called `sam`, not a path.
 */
export const playerPath = (slug?: string | null): string =>
  stegaClean(slug ?? '')
    .trim()
    .replaceAll(/^\/+|\/+$/g, '');

/**
 * Whether this player can be drawn as a card — the section's filter and the stories' expectation, in
 * one place.
 *
 * `hasText` for the name rather than `?.trim()`, because in draft mode even a blank string carries a
 * stega payload that `trim()` does not remove. `playerPath` for the slug, because it is the function
 * the card builds its `href` from — so "has a destination" means exactly what the link will use.
 */
export const isSelectablePlayer = (player: IPlayerSelectSectionPlayer | null | undefined): player is SelectablePlayer =>
  Boolean(player) && hasText(player?.name) && playerPath(player?.slug?.current) !== '';
