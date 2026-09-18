import { stegaClean } from '@sanity/client/stega';
import type { CSSProperties } from 'react';

import Container from '@/components/Container';
import Link from '@/components/Link';
import ModelViewer from '@/components/ModelViewer';
import PlayerCard from '@/components/PlayerCard';
import Section from '@/components/Section';
import Text from '@/components/Text';
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
 * ## The bar is full-bleed, so the component brings its own containers
 *
 * The comp runs the bar's rule edge to edge of the frame while everything else sits inside the
 * gutter — the same construction as the site header directly above it, whose rule is also full
 * width. So the showcase renders its own `Section` with `full`, the rule sits on the full-width
 * `nav`, and the inset comes from a `Container` inside it and another around the stage, exactly as
 * `components/Header` does it. Both containers are also the layout's query containers: they have
 * the same content width, so the one breakpoint means the same thing in the bar and in the stage.
 *
 * The `Section` is the showcase's own rather than the template's because the showcase depends on
 * it: the name takes its ink from the `--fg-default` the section's theme sets, and the space beneath
 * the stage is the section's bottom spacing. Owned here, every render — the page and each story —
 * is the same composition, with no copy of it to drift.
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
 *
 * ## Tests run on clean strings; the page renders the encoded ones
 *
 * In draft mode `sanityFetch` sets `stega: true`, which appends an invisible payload to every plain
 * string — the Presentation tool's click-to-edit map. So every *test* below reads a `stegaClean`
 * copy while the markup keeps the original, the split `components/Footer` makes for the same reason.
 * Without it three things go wrong, all of them only where an editor is looking:
 *
 * - the payload's alphabet includes U+FEFF, which `\s` matches, so the name's longest "word" is the
 *   longest run of payload — 17 rather than 6 for "Lauren", measured through the client's own
 *   encoder — and the name is fitted as though it were that long, at about a third of its size;
 * - the clip names reach `ModelViewer`'s matcher encoded, match nothing in the GLB, and the
 *   character renders in its bind pose instead of dancing;
 * - blank is not blank once encoded: an empty or whitespace-only eyebrow or level still carries a
 *   payload, so the emptiness tests pass and draw an empty eyebrow line, or the lone header band an
 *   absent level and stat list are meant to leave out. The values render as authored, untrimmed;
 *   HTML collapses the whitespace around them.
 */
const PlayerShowcase = (props: PlayerShowcaseProps) => {
  const { className, player, roster } = props;
  const { clips, eyebrow, fallbackImage, level, model, name, slug, stats } = player;

  /*
   * `PLAYER_PAGE_QUERY` filters the player and the roster alike, so this player is always in it. The
   * clamps are for a roster handed in by anything else: an empty one reads "01 / 01" rather than
   * "01 / 00", and one without this player counts from the first entry rather than from -1.
   */
  const total = Math.max(roster.length, 1);
  const index = Math.max(
    roster.findIndex((entry) => entry.slug === slug),
    0
  );
  const position = `${formatOrdinal(index)} / ${formatOrdinal(total - 1)}`;

  const next = roster.length > 1 ? roster[(index + 1) % roster.length] : undefined;

  /*
   * The longest run the display face has to hold on one line — a word cannot wrap, so it is the
   * longest word rather than the whole name that the column must fit. See `.name` in the styles.
   */
  const longestWord = Math.max(
    ...stegaClean(name)
      .trim()
      .split(/\s+/)
      .map((word) => word.length),
    1
  );

  const hasEyebrow = Boolean(eyebrow && stegaClean(eyebrow).trim());
  const cardLevel = level && stegaClean(level).trim() ? level : undefined;
  const statList = stats ?? [];
  const hasCard = statList.length > 0 || Boolean(cardLevel);

  /*
   * Named "Switch player, Lauren" — the visible words in their visible order (WCAG 2.5.3), so a
   * speech-input user saying what they see gets a match. The arrow is a symbol rather than a word,
   * so it is left out rather than spoken as "right arrow" or translated into a "to" that splits the
   * visible label in two.
   */
  const switchControl = (placement: 'bar' | 'bottom') =>
    next ? (
      <Link
        ariaLabel={`Switch player, ${next.name}`}
        className={placement === 'bar' ? styles.switchBar : styles.switchBottom}
        fullWidth={placement === 'bottom'}
        href={`/${next.slug}/`}
        mono
        outline
        size="sm"
        theme="accent"
        variant="ui"
      >
        Switch player → {next.name}
      </Link>
    ) : null;

  return (
    <Section className={className} full name="player" removeTopSpacing spacing="md" theme="light">
      <nav aria-label="Player" className={styles.bar}>
        <Container className={styles.frame} width="xl">
          <div className={styles.barRow}>
            <Link ariaLabel="Back to home" arrow="left" className={styles.back} href="/" mono size="sm" variant="bare">
              Back
            </Link>
            <p className={styles.pager}>
              <Text
                as="span"
                className={styles.pagerShort}
                color="themeFgAccent"
                size="xs"
                text={`P ${position}`}
                textTransform="uppercase"
                variant="mono"
              />
              <Text
                as="span"
                className={styles.pagerLong}
                color="themeFgAccent"
                size="xs"
                text={`Player ${position}`}
                textTransform="uppercase"
                variant="mono"
              />
            </p>
            {switchControl('bar')}
          </div>
        </Container>
      </nav>

      <Container className={styles.frame} width="xl">
        <div className={styles.stage}>
          <div className={styles.heading} style={{ '--player-name-length': longestWord } as CSSProperties}>
            {hasEyebrow ? (
              <Text
                as="p"
                className={styles.eyebrow}
                color="themeFgAccent"
                text={eyebrow}
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
              clips={stegaClean(clips)}
              fallbackImage={fallbackImage}
              label={MODEL_LABEL}
              orbit
              // The page's hero. Only the fallback image can be an LCP candidate — see the prop.
              priority
              restClip="feature"
              src={model?.url ?? undefined}
            />
          </div>

          {hasCard ? (
            <div className={styles.card}>
              <PlayerCard level={cardLevel} stats={statList} />
            </div>
          ) : null}
        </div>

        {switchControl('bottom')}
      </Container>
    </Section>
  );
};

export default PlayerShowcase;
