import PlayerTemplate, { generatePlayerMetadata } from '@/templates/PlayerTemplate';
import type { PlayerSlug } from '@/templates/PlayerTemplate';

/**
 * A static route rather than a `[player]` segment — see `templates/PlayerTemplate`. This file and
 * `app/(frontend)/lauren/page.tsx` differ only in this constant, which the `PlayerSlug` type holds to
 * one of `PLAYER_SLUGS`.
 */
const SLUG: PlayerSlug = 'sam';

export const generateMetadata = () => generatePlayerMetadata(SLUG);

const SamPage = () => <PlayerTemplate slug={SLUG} />;

export default SamPage;
