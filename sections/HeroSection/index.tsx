import type { FC } from 'react';

import Section from '@/components/Section';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import { couplePartners } from '@/helpers/coupleNames';
import formatDateRange from '@/helpers/formatDateRange';
import hasText from '@/helpers/hasText';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IHeroSection } from '@/tools/sanity/schema/sections/heroSection';

import styles from './styles.module.scss';

/**
 * A plain CMS string when it has text in it, `undefined` when it does not — so the JSX below can
 * test a value and render it in one expression.
 *
 * Blank is `hasText`'s answer rather than `.trim()`'s, because in the Presentation tool a field left
 * blank arrives stega-encoded and a plain `.trim()` test reads it as filled: the venue would render
 * as a separator with nothing after it. What comes back is the original string, trimmed but still
 * encoded, so the overlay keeps its edit link on the text on screen.
 */
const textOf = (value?: string | null): string | undefined => (hasText(value) ? value?.trim() : undefined);

/**
 * The street: the first line of the venue's address that has anything on it.
 *
 * "First line" is the ticket's rule and the schema's field description; "that has anything on it" is
 * so a stray leading newline does not silently drop the street. `\r?` because a pasted address can
 * carry Windows line endings, which Sanity stores as typed.
 *
 * The one string here that loses its Presentation edit link, and knowingly: stega appends its
 * payload to the end of the *whole* address, so it rides on the last line and this takes the first.
 * The street still renders and still updates live; it is only not click-to-edit.
 */
const firstLineOf = (value?: string | null): string | undefined =>
  textOf(value?.split(/\r?\n/).find((line) => hasText(line)));

/**
 * The middot between the two halves of a meta line.
 *
 * `aria-hidden`, following `components/Footer`: it is punctuation standing in for a pause, and how a
 * screen reader pronounces a middle dot varies by reader and verbosity setting.
 *
 * The space before it is a no-break space, so a line that wraps breaks *after* the dot — "12–14.02.27 ·"
 * over "THE LODGE JAMBEROO" — and never strands one at the start of a line. Real characters rather
 * than a flex gap, unlike the footer, because both lines here are running text the design sets with
 * literal spaces, and so that copying a line yields its words with the gaps between them.
 *
 * Written as entities on purpose. A no-break-space escape in a string literal is rewritten by
 * `yarn fix` into the bare character, which is indistinguishable from an ordinary space in the
 * source — and this one is load-bearing.
 */
const Separator = () => (
  <>
    &nbsp;<span aria-hidden="true">&middot;</span>{' '}
  </>
);

/**
 * The home page's opening block — the couple's names stacked in oversized display type, over a
 * two-sided meta row: dates and venue on the left, street and travel note on the right.
 *
 * Everything shown is joined from `weddingSettings` by the projection; nothing is authored on the
 * section. Every field is optional there, so every combination of blanks is a state this renders:
 * one partner, no dates, no venue, no address, no travel note, no singleton at all. None of them
 * leaves a `·` or an `&` with nothing on one side of it.
 */
const HeroSection: FC<IHeroSection> = (props) => {
  const { weddingSettings } = props;
  const { coupleNames, startDate, endDate, venue } = weddingSettings ?? {};

  /*
   * One or two names; never none, because the helper falls back to both when neither is filled in —
   * this is the page's `<h1>`, and a page without one is worse than a hard-coded name. See the note
   * on `FALLBACK_PARTNERS` in `tools/helpers/coupleNames.ts`.
   */
  const [firstPartner, secondPartner] = couplePartners(coupleNames);

  // "12–14.02.27", as drawn (node 1:68). Empty when neither date is set, which drops that half.
  const dates = formatDateRange(startDate, endDate, { style: 'numeric' });
  const venueName = textOf(venue?.name);
  const street = firstLineOf(venue?.address);
  const travelNote = textOf(venue?.travelNote);

  const hasSummary = Boolean(dates || venueName);
  const hasDirections = Boolean(street || travelNote);

  return (
    <Section
      name="HeroSection"
      theme={getSectionTheme(props, 'light')}
      /*
       * Carries the two spacing re-points — each edge's step, pointed at the pair the design draws
       * for it. On the section root because that is the element `Section`'s `.spacing_*` classes sit
       * on and read the tokens from. See `.section` in styles.module.scss.
       */
      className={styles.section}
      containerClassName={styles.container}
      {...getSectionSpacingProps(props)}
      /*
       * **After** the spread, deliberately: `getSectionSpacingProps` returns a hardcoded
       * `spacing: 'lg'`, so a `spacing` written before it is silently dead and `yarn audit:layout`
       * reports exactly that ordering. The editor's two remove-spacing toggles still come through
       * the spread and still win inside `Section`.
       *
       * Two steps, because the design draws two different separations:
       *
       * - **Top**, from the bar to the names: 28px on the phone frame (1:112), 42.9px on the desktop
       *   one (1:63). `sm`, the step `headerDisplaySection` uses for the same edge on every other page.
       * - **Bottom**, from the meta row to the player-select panel: 23px and 36px. It is this
       *   section's to carry — the convention on these pages is that a band's top edge is flush and
       *   the gap above it belongs to the section before (see `specCardGridSection`). `xs`, the next
       *   step down, because the gap is.
       *
       * Neither stock step is drawn at these values — `sm` is 16px on a phone and `xs` 29px at a
       * 1280px viewport — so `styles.section` re-points both to the measured pairs.
       */
      spacing={['sm', 'xs']}
    >
      {/*
       * The names are the page's `<h1>` — the AC — and there is no editor choice to override: the
       * section has no title field, so no `TitleInput` level selector to disagree with it.
       *
       * One line per partner, the ampersand ending the first, as drawn ("SAM &" over "LAUREN"). Each
       * line is a block span rather than a `<br>`, and the `{' '}` between them is load-bearing even
       * though it paints nothing (whitespace between two blocks generates no box): it is what makes
       * the heading's text, and so its accessible name, "Sam & Lauren" rather than "Sam &Lauren".
       *
       * A plain space before the ampersand, not a no-break one. A long first name that does not fit
       * the measure then puts the ampersand on a line of its own, where a no-break space would glue
       * it to the name and force `overflow-wrap` to split the name mid-word instead.
       *
       * `variant="display" size="lg"` is `--display-lg`, fluid(64px, 176px), whose wide anchor is
       * node 1:65's 176px. Leading and tracking are the display tier's own (0.84, -0.045em), measured
       * off this same node — nothing is overridden here.
       */}
      <Text as="h1" size="lg" textTransform="uppercase" variant="display">
        <span className={styles.name}>
          {firstPartner}
          {secondPartner && ' &'}
        </span>
        {secondPartner && (
          <>
            {' '}
            <span className={styles.name}>{secondPartner}</span>
          </>
        )}
      </Text>

      {(hasSummary || hasDirections) && (
        <div className={styles.meta}>
          {hasSummary && (
            /*
             * Archivo Medium, uppercase — `variant="heading"` for the family's weight axis, with the
             * family itself and the drawn size pair supplied by `.summary`. See the note there.
             */
            <Text
              as="p"
              className={styles.summary}
              size="xs"
              textTransform="uppercase"
              variant="heading"
              weight="medium"
            >
              {dates}
              {Boolean(dates && venueName) && <Separator />}
              {venueName}
            </Text>
          )}

          {hasDirections && (
            /*
             * The mono meta-item treatment `headerDisplaySection` renders its facts in, reused through
             * the same `Text` props rather than re-declared: JetBrains Mono at `--body-xs`, the quiet
             * register's Medium weight and 0.1em tracking, uppercase, in the theme's accent ink.
             * `color="themeFgAccent"` is the prop form of the `color: var(--fg-accent)` that section
             * writes in its module; there is nothing left for `.directions` to say about type.
             *
             * `directions_streetOnly` hides the whole line below the switch when the street is all it
             * holds — the street is what the phone layout drops, and an empty `<p>` would still take
             * the stack's gap.
             */
            <Text
              as="p"
              className={classNames(styles.directions, { [styles.directions_streetOnly]: !travelNote })}
              color="themeFgAccent"
              size="xs"
              textTransform="uppercase"
              variant="mono"
              weight="medium"
            >
              {street && (
                /*
                 * The separator lives *inside* the street's span, so the phone layout's
                 * `display: none` takes the street and the dot after it together and never leaves a
                 * leading "·" on the travel note.
                 */
                <span className={styles.street}>
                  {street}
                  {travelNote && <Separator />}
                </span>
              )}
              {travelNote}
            </Text>
          )}
        </div>
      )}
    </Section>
  );
};

export default HeroSection;
