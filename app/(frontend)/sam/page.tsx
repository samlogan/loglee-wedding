import PlayerTemplate, { generatePlayerMetadata } from '@/templates/PlayerTemplate';

/**
 * A static route rather than a `[player]` segment — see `templates/PlayerTemplate`. This file and
 * `app/(frontend)/lauren/page.tsx` differ only in this constant.
 */
const SLUG = 'sam';

export const generateMetadata = () => generatePlayerMetadata(SLUG);

const SamPage = () => <PlayerTemplate slug={SLUG} />;

export default SamPage;
