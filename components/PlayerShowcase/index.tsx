import Link from '@/components/Link';
import ModelViewer from '@/components/ModelViewer';
import PlayerCard from '@/components/PlayerCard';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import formatOrdinal from '@/helpers/formatOrdinal';
import type { ModelClipNames } from '@/helpers/modelClips';
import type { IPlayerStat } from '@/tools/sanity/schema/documents/player';

import styles from './styles.module.scss';

/** The fields `PLAYER_PAGE_QUERY` projects for one player. */
export interface PlayerShowcasePlayer {
  name: string;
  slug: string;
  eyebrow?: string | null;
  level?: string | null;
  clips?: ModelClipNames | null;
  stats?: IPlayerStat[] | null;
  model?: { url?: string | null; originalFilename?: string | null } | null;
  fallbackImage?: SanityImageSimple | null;
}

/** One entry in the roster — enough to count the players and link to the next one. */
export interface PlayerShowcaseRosterEntry {
  name: string;
  slug: string;
}

export interface PlayerShowcaseProps {
  className?: string;
  player: PlayerShowcasePlayer;
  /** Every player, in the Studio's `order`. Drives the pager and the switch target. */
  roster: PlayerShowcaseRosterEntry[];
}

/**
 * Describes the view rather than the player, so it is true on both pages. The comp's desktop form
 * names the rendering library; the mobile form is this one, and one string has to serve both.
 */
const MODEL_LABEL = '3D canvas · dance';

/**
 * The player page — utility bar, the model beside the name and player card, and the switch control.
 *
 * ## Reading order is the DOM order, at every width
 *
 * The mobile comp interleaves the two desktop columns: name, then model, then card. That order is
 * a reading-order requirement, and `order` / `grid-row` reorder paint without touching what a
 * screen reader or the Tab key reaches. So the DOM is written name → model → card, and desktop gets
 * its two columns from `grid-template-areas` rather than from two wrapper columns. The model spans
 * both rows on the left while the heading and card stack on the right; a screen reader still reads
 * name, model, card, which is the sequence a sighted phone user sees.
 *
 * ## One switch control, rendered in two places
 *
 * The comp puts it top-right in the bar on desktop and full width at the foot of the page on
 * mobile. A single element can only hold one position in the document, so wherever it sits, one of
 * the two widths gets a Tab order that disagrees with what is on screen (WCAG 2.4.3). It is
 * therefore rendered twice from **one** roster lookup — the acceptance criterion's concern is two
 * CMS fields, and there is one — with the inactive copy `display: none`, which takes it out of the
 * layout, the accessibility tree and the tab order together. `components/Header` makes the same call
 * for its RSVP label; see the styles for why the swap is written mobile-first.
 *
 * ## Degrading on unwritten content
 *
 * Every player field beyond the name and model is optional, and on the live dataset all of them are
 * empty. A missing eyebrow renders nothing rather than a gap, and a card with no stats and no level
 * is omitted entirely — `PlayerCard` would otherwise draw a lone header band with nothing beneath it.
 */
const PlayerShowcase = (props: PlayerShowcaseProps) => {
  const { className, player, roster } = props;
  const { clips, eyebrow, fallbackImage, level, model, name, slug, stats } = player;

  // A roster that somehow omits this player still counts it, so the pager never reads "00 / 01".
  const total = Math.max(roster.length, 1);
  const index = Math.max(
    roster.findIndex((entry) => entry.slug === slug),
    0
  );
  const position = `${formatOrdinal(index)} / ${formatOrdinal(total - 1)}`;

  const next = roster.length > 1 ? roster[(index + 1) % roster.length] : undefined;
  const nextHref = next ? `/${next.slug}/` : undefined;

  const trimmedEyebrow = eyebrow?.trim();
  const trimmedLevel = level?.trim();
  const statList = stats ?? [];
  const hasCard = statList.length > 0 || Boolean(trimmedLevel);

  const switchControl = (placement: 'bar' | 'bottom') =>
    next && nextHref ? (
      <Link
        ariaLabel={`Switch player to ${next.name}`}
        className={placement === 'bar' ? styles.switchBar : styles.switchBottom}
        fullWidth={placement === 'bottom'}
        href={nextHref}
        mono
        outline
        theme="primary"
        variant="square"
      >
        Switch player → {next.name}
      </Link>
    ) : null;

  return (
    <div className={classNames(styles.showcase, className)}>
      <nav aria-label="Player" className={styles.bar}>
        <Link ariaLabel="Back to home" className={styles.back} href="/" mono variant="bare">
          ← Back
        </Link>
        <p className={styles.pager}>
          <Text
            as="span"
            className={styles.pagerShort}
            text={`P ${position}`}
            textTransform="uppercase"
            variant="mono"
          />
          <Text
            as="span"
            className={styles.pagerLong}
            text={`Player ${position}`}
            textTransform="uppercase"
            variant="mono"
          />
        </p>
        {switchControl('bar')}
      </nav>

      <div className={styles.stage}>
        <div className={styles.heading}>
          {trimmedEyebrow ? (
            <Text
              as="p"
              className={styles.eyebrow}
              color="themeFgAccent"
              text={trimmedEyebrow}
              textTransform="uppercase"
              variant="mono"
              weight="bold"
            />
          ) : null}
          <Text as="h1" className={styles.name} size="lg" text={name} textTransform="uppercase" variant="display" />
        </div>

        <div className={styles.model}>
          <ModelViewer
            alt={`${name}, dancing`}
            badge={model?.originalFilename ?? undefined}
            clips={clips}
            fallbackImage={fallbackImage}
            label={MODEL_LABEL}
            orbit
            restClip="feature"
            src={model?.url ?? undefined}
          />
        </div>

        {hasCard ? (
          <div className={styles.card}>
            <PlayerCard level={trimmedLevel} stats={statList} />
          </div>
        ) : null}
      </div>

      {switchControl('bottom')}
    </div>
  );
};

export default PlayerShowcase;
