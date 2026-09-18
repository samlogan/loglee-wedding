import PlayerTemplate, { generatePlayerMetadata } from '@/templates/PlayerTemplate';
import type { PlayerSlug } from '@/templates/PlayerTemplate';

/**
 * A static route rather than a `[player]` segment — see `templates/PlayerTemplate`. This file and
 * `app/(frontend)/sam/page.tsx` differ only in this constant, which the `PlayerSlug` type holds to
 * one of `PLAYER_SLUGS`.
 */
const SLUG: PlayerSlug = 'lauren';

export const generateMetadata = () => generatePlayerMetadata(SLUG);

const LaurenPage = () => <PlayerTemplate slug={SLUG} />;

export default LaurenPage;
