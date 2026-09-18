import type { FC } from 'react';

import Section from '@/components/Section';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import { couplePartners } from '@/helpers/coupleNames';
import formatDateRange from '@/helpers/formatDateRange';
import hasText from '@/helpers/hasText';
import { getSectionSpacingProps, getSectionTheme } from '@/helpers/section';
import type { IHeroSection } from '@/tools/sanity/schema/sections/heroSection';

import styles from './styles.module.scss';

/**
 * A plain CMS string when it has text in it, `undefined` when it does not — so the JSX below can
 * test a value and render it in one expression.
 *
 * Blank is `hasText`'s answer rather than `.trim()`'s, because in the Presentation tool a field left
 * blank arrives stega-encoded and a plain `.trim()` test reads it as filled: the venue would render
 * as a separator with nothing after it. The string kept is trimmed but still encoded, for the reason
 * `couplePartners` gives.
 */
const textOf = (value?: string | null): string | undefined => (hasText(value) ? value?.trim() : undefined);

/**
 * The street: the first line of the venue's address that has anything on it.
 *
 * "First line" is the ticket's rule and the schema's field description; "that has anything on it" is
 * so a stray leading newline does not silently drop the street. `\r?` because a pasted address can
 * carry Windows line endings, which Sanity stores as typed. The `MessyAddress` story pins both.
 *
 * The one string here that loses its Presentation edit link, and knowingly: stega appends its
 * payload to the end of the *whole* address, so it rides on the last line and this takes the first.
 * The street still renders and still updates live; it is only not click-to-edit.
 */
const firstLineOf = (value?: string | null): string | undefined =>
  textOf(value?.split(/\r?\n/).find((line) => hasText(line)));

/**
 * The separator between the two halves of a meta line: a middle dot for the eye, a comma for the ear.
 *
 * The dot is `aria-hidden`, following `components/Footer` — how a screen reader pronounces a middle
 * dot varies by reader and verbosity setting. Hidden and nothing else, though, the two halves ran
 * together when read aloud ("…Mountain Rd 90 min south…" sounds like one road), so a clipped comma
 * sits in its place for assistive technology and gives the pause the dot gives on screen. See
 * `.spoken` for why it neither shows nor copies.
 *
 * The space before the dot is a no-break space, so a line that wraps breaks *after* it — "12–14.02.27 ·"
 * over "THE LODGE JAMBEROO" — and never strands one at the start of a line. Real characters rather
 * than a flex gap, unlike the footer, because both lines here are running text the design sets with
 * literal spaces. Written as entities on purpose: a no-break-space escape in a string literal is
 * rewritten by `yarn fix` into the bare character, indistinguishable from an ordinary space in the
 * source.
 */
const Separator = () => (
  <>
    <span className={styles.spoken}>,</span>&nbsp;<span aria-hidden="true">&middot;</span>{' '}
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

  /*
   * "12–14.02.27", as drawn (node 1:68), for the eye — and "12–14 Feb 2027" for the ear. Read aloud,
   * the dotted form is three runs of digits with a two-digit year and no telling day from month; the
   * footer's form is a date. Both empty when neither date is set, which drops that half of the line.
   */
  const dates = formatDateRange(startDate, endDate, { style: 'numeric' });
  const spokenDates = formatDateRange(startDate, endDate);
  const venueName = textOf(venue?.name);
  const street = firstLineOf(venue?.address);
  const travelNote = textOf(venue?.travelNote);

  const hasSummary = Boolean(dates || venueName);
  const hasDirections = Boolean(street || travelNote);

  return (
    <Section
      name="HeroSection"
      theme={getSectionTheme(props, 'light')}
      // The two spacing re-points live here, on the element `Section`'s spacing classes read from.
      className={styles.section}
      containerClassName={styles.container}
      {...getSectionSpacingProps(props)}
      /*
       * **After** the spread, deliberately: `getSectionSpacingProps` returns a hardcoded
       * `spacing: 'lg'`, so a `spacing` written before it is silently dead and `yarn audit:layout`
       * reports exactly that ordering. The editor's two remove-spacing toggles still come through
       * the spread and still win inside `Section`.
       *
       * Two steps because the design draws two separations — the bar to the names, and the meta row
       * to the next band, which this section carries. Their values, and why the tokens are re-pointed
       * rather than the padding hand-written, are in `.section` in styles.module.scss.
       */
      spacing={['sm', 'xs']}
    >
      {/*
       * The names are the page's `<h1>` — the AC — and there is no editor choice to override: the
       * section has no title field, so no `TitleInput` level selector to disagree with it. The schema
       * warns an editor who places a second `<h1>`-rendering section, or puts this one below another.
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
        <div className={classNames(styles.meta, { [styles.meta_streetOnly]: !(hasSummary || travelNote) })}>
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
              {dates && (
                <>
                  <span aria-hidden="true">{dates}</span>
                  <span className={styles.spoken}>{spokenDates}</span>
                </>
              )}
              {Boolean(dates && venueName) && <Separator />}
              {venueName}
            </Text>
          )}

          {hasDirections && (
            /*
             * The mono meta-item treatment `headerDisplaySection` renders its facts in, reused through
             * the same `Text` props rather than re-declared: JetBrains Mono at `--body-xs`, the quiet
             * register's Medium weight and 0.1em tracking, uppercase, in the theme's accent ink —
             * `color="themeFgAccent"` being the prop form of the `color: var(--fg-accent)` that section
             * writes in its module.
             *
             * One deliberate difference: that section re-points `--mono-line-height` to the body's 1.5,
             * because its list's row gap was fitted to that line box. This line keeps the role's 1.3,
             * which is what the comp draws here (`normal` on JetBrains Mono, 17px on 13px) and what
             * `.meta`'s stack gap is fitted to.
             *
             * The street, and the separator after it, drop out on a phone — see `.street` and
             * `.directions_streetOnly` for how, and why the line goes too when the street is all it has.
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
