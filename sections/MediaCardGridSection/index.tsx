import type { FC } from 'react';

import MediaCard from '@/components/MediaCard';
import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import hasBlockContent from '@/helpers/hasBlockContent';
import stripTitleTags from '@/helpers/stripTitleTags';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IMediaCardGridSection } from '@/tools/sanity/schema/sections/mediaCardGridSection';

import styles from './styles.module.scss';

/**
 * A grid of `components/MediaCard`s — the feature-venue pair on `/the-lodge`, nodes `16:134`
 * (desktop) and `16:282` (mobile).
 *
 * ## Almost all of this is composition
 *
 * The card is already built and already owns everything inside its own border: the media band, the
 * caption chip's placement and stacking, the baseline-tied header row, the body type, the hairline,
 * the footer frame and the `height: 100%` that lets a row of cards bottom-align its footers. This
 * file owns three things the card deliberately does not — **the grid, the three venue measurements,
 * and the optional heading above it.**
 *
 * The venue measurements are custom properties rather than props, and the grid is here rather than
 * in the card, because that split is what lets `/stay`'s room grid and this venue grid share one
 * component without negotiating a column count. See `components/MediaCard` for the full argument.
 *
 * ## The heading is optional and blank on `/the-lodge`
 *
 * The drawn region has no heading row. The "BETWEEN EVENTS / FREE FOR ALL GUESTS" band at node
 * `16:163` sits *below* these cards and belongs to the facilities grid. `tagline` / `title` /
 * `content` are here for reuse and render only when filled — a design review against `16:134` should
 * find no heading, because there is none to find.
 */
const MediaCardGridSection: FC<IMediaCardGridSection> = (props) => {
  const { cards, content, tagline, title } = props;

  /*
   * Nothing at all rather than an empty shell.
   *
   * `Section` paints `--bg-default` and its own block padding, so returning it with no cards
   * publishes a blank coloured strip. `cards` carries `Rule.min(1)`, so the only way here is a
   * half-built section in Presentation — where rendering nothing is the honest signal.
   *
   * Tested on the array rather than on the props object: an array field that exists but is empty
   * satisfies Sanity's `required()`, which is why the schema uses `min(1)` and why this guard cannot
   * be skipped on the strength of a validation rule.
   */
  if (!cards?.length) {
    return null;
  }

  /*
   * `stripTitleTags(...).text`, not `title?.trim()`.
   *
   * `TitleInput` stores markup, so a field an editor filled in and then emptied is the string
   * `'<h2></h2>'` — truthy, non-empty after `trim()`. Testing it raw would render an empty `<h2>` in
   * the page outline, draw the heading block's `margin-block-end` above the grid, and demote every
   * card name to `h3` under a heading that is not there. All three on a section whose heading is
   * *expected* to be blank, which is the case `/the-lodge` actually ships.
   *
   * `MediaCard` and `TwoColumnListSection` document the same trap; this is the same field type.
   */
  const { as: headingAs, text: headingRaw } = stripTitleTags(title ?? '');
  const headingTitle = headingRaw.trim();
  const taglineText = tagline?.trim();
  const hasContent = hasBlockContent(content);
  const hasHeading = Boolean(taglineText) || Boolean(headingTitle) || hasContent;

  /*
   * One level below the section's heading, **derived** rather than the literal `'h3'`.
   *
   * `TextTitle` takes the heading's level from the editor's markup, so a section titled `<h3>` would
   * make the cards its siblings and an `<h4>` would make them outrank it. Only the `h2` default
   * composed correctly, which made the old literal right by luck rather than by construction.
   *
   * `undefined` when there is no heading, which leaves each card on the level its own field chose —
   * the `/the-lodge` case, where the section heading is deliberately blank and the card's schema
   * defaults to `h2` so the page does not skip from `h1`.
   *
   * Gated on `headingTitle` and **not** on `hasHeading`, which is an OR across the tagline, the title
   * and the body. A section with only a tagline filled in renders no heading element at all, so
   * demoting on `hasHeading` skips the page from `h1` straight to `h3` — a heading-order failure
   * (WCAG 1.3.1) in a perfectly legitimate authoring state. Only a real heading may demote what sits
   * under it.
   */
  const headingLevel = headingTitle && /^h[1-5]$/.test(headingAs ?? '') ? Number(headingAs?.[1]) : undefined;
  const cardTitleAs = headingLevel ? (`h${headingLevel + 1}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6') : undefined;

  return (
    <Section
      name="MediaCardGridSection"
      /*
       * The query container is `Section`'s own `Container`, so the grid's two-column switch is a
       * function of the content width the design measures its columns against rather than of the
       * viewport. See the stylesheet for why that is a container query at all.
       */
      containerClassName={styles.container}
      theme={getSectionTheme(props, 'light')}
      {...getSectionSpacingProps(props)}
      /*
       * **After** the spread, deliberately: `getSectionSpacingProps` returns a hardcoded
       * `spacing: 'lg'`, so a `spacing` written before it is silently dead and `yarn audit:layout`
       * reports exactly that ordering.
       *
       * `xs` because the drawn region is tight. On `/the-lodge` the aerial block above ends at
       * y = 901.75 and the first card starts at y = 921.75 — 20px of lead-in — and the region's
       * bottom edge is flush with the cards, because the "BETWEEN EVENTS" heading below owns that
       * gap with 48px of its own top padding. Mobile draws the same shape at 16px / 0.
       *
       * `--section-spacing-xs` is `fluid(12px, 32px)`, the smallest step on the scale: 12px at the
       * narrow anchor against a drawn 16, and 29px at 1280 against a drawn 20. Closer than `none`
       * (which is 20px short at desktop) and the only token-shaped answer — a hand-written value here
       * would be a fourth spacing scale.
       *
       * The drawn **zero** at the bottom is the editor's `removeBottomSpacing` toggle, which is
       * exactly what it is for and how this page is authored; the Default story pins it so the story
       * reproduces the comp. Hardcoding `['xs', 'none']` here instead would win that one page and
       * give every other placement of this section a grid welded to whatever follows it.
       */
      spacing="xs"
    >
      {/*
       * No `Container` import: `Section` already wraps its children in one whenever `full` is unset,
       * at the default `--container-xl` cap with the site's fluid gutter. That resolves to 1206px of
       * content at a 1280 viewport against the comp's 1200 and 350px at 390 against a drawn 350 —
       * i.e. the default *is* the design. Adding a second `Container` inside it would double the
       * gutter.
       */}
      {hasHeading && (
        <div className={styles.heading}>
          {taglineText && (
            /*
             * Every one of these four is a prop rather than a line in the module, and `size` is the
             * one that has to be stated.
             *
             * **`variant="mono"` has no size default** — the role deliberately leaves `font-size`
             * to the caller, because its call sites are drawn at pairs that are not on the scale.
             * Omitting it does not fall back to the micro-label step; it inherits `body`'s flat
             * 16px, which rendered this eyebrow about 4px oversized and heavier than the heading
             * beneath it. `--body-xs` (`fluid(11px, 12px)`) is the nearest step to the 11→13 the two
             * shipped section eyebrows are drawn at, and `weight="bold"` selects the role's tracked
             * register, which is what both of those use.
             */
            <Text
              color="themeFgAccent"
              size="xs"
              text={taglineText}
              textTransform="uppercase"
              variant="mono"
              weight="bold"
            />
          )}
          {headingTitle && (
            /*
             * The **raw** markup, not the stripped text above. `TextTitle` strips the tags itself and
             * takes the element from them, so passing the raw string keeps the level the editor chose
             * in the field; passing the stripped text would throw that away and default every section
             * heading to `h2`. The stripped copy exists only to answer "is this field actually
             * filled in", which the raw string cannot.
             *
             * `lg` and not `md`. `--heading-md` is `fluid(28px, 40px)` against the card title's
             * `fluid(30px, 40px)` — the same size as the names it heads at desktop and *smaller*
             * than them on mobile, so the heading never outranks its own grid. `--heading-lg`
             * (`fluid(32px, 48px)`) clears it at both ends. There is no drawn reference for this row
             * — the comp has no heading — so this is the hierarchy argument, not a measurement.
             */
            <TextTitle className={styles.title} size="lg" textTransform="uppercase" title={title} variant="heading" />
          )}
          {hasContent && <TextBlock blocks={content} className={styles.content} />}
        </div>
      )}

      {/*
       * `role="list"` is not redundant: the global reset sets `list-style-type: none` on every `ul`,
       * and WebKit strips the `list` role from an unstyled list that does not claim it back — so
       * VoiceOver would announce these cards as loose text. Same reasoning as `components/Footer`,
       * `HeaderDisplaySection` and `ScheduleSection`.
       *
       * `ul` and not `ol`: two venues side by side have no order to preserve — reordering Lulu's and
       * Fin's Bar changes the layout and nothing about the meaning, which is the test.
       *
       * Deliberately **not** named with `aria-label`. When the heading is filled it precedes the
       * list and gives it context the normal way; when it is blank — as on `/the-lodge` — the
       * alternatives both cost more than they return. `aria-label` would duplicate CMS copy into the
       * accessibility tree where it drifts, and `aria-labelledby` needs a page-unique id, which this
       * server component cannot mint (`useId` is a hook) and cannot derive, because `_key` is unique
       * only within one section's array. `ScheduleSection` records the same trade at length.
       */}
      <ul className={styles.grid} role="list">
        {cards.map((card) => {
          /*
           * Keyed by the item's own text, because these are short lines an editor reorders in place
           * and an index key would leave the old text in the old node.
           *
           * That needs the text to be unique. `hours` carries `Rule.unique()` — but a Sanity
           * validation rule is **publish-time** and Presentation renders drafts, so a draft mid-edit
           * really can hold two identical lines and `key={hour}` would hand React duplicate keys for
           * them: a console error and undefined reconciliation, in the one environment an editor is
           * watching. Disambiguating by occurrence leaves the common case byte-identical to the bare
           * text and makes the degenerate one merely ugly. `TwoColumnListSection` makes exactly this
           * argument for exactly this field shape — with one correction. Suffixing only the
           * *repeats* re-creates the collision it exists to prevent: `['a', 'a', 'a#1']` yields
           * `a`, `a#1`, `a#1`. The suffix is always a bare integer, so suffixing unconditionally
           * cannot collide, and nothing compares keys across renders of different shapes — the
           * "byte-identical in the common case" property being traded away buys nothing.
           *
           * Blanks are dropped first: an array of plain strings keeps every row an editor tabbed
           * through and moved on from, and an empty run would still take a slot in the footer's gap
           * — or, worse, be the *only* item, drawing a hairline over nothing.
           */
          const seen = new Map<string, number>();
          const hours = (card.hours ?? []).reduce<{ key: string; text: string }[]>((accumulator, hour) => {
            const text = hour?.trim();

            if (!text) {
              return accumulator;
            }

            const occurrence = seen.get(text) ?? 0;
            seen.set(text, occurrence + 1);
            accumulator.push({ key: `${text}#${occurrence}`, text });

            return accumulator;
          }, []);

          return (
            /*
             * `display: flex` on the `<li>` rather than trusting the grid.
             *
             * `align-items: stretch` reaches the **direct child** of the grid, which is this `<li>`,
             * not the card inside it. The card's own `height: 100%` is what bottom-aligns a row of
             * footers, and a percentage height needs a parent that resolves one — so the `<li>`
             * passes the stretch through. Dropping the wrapper is not an option: a bare `<div>` grid
             * would take the list semantics with it.
             */
            <li className={styles.item} key={card._key}>
              <MediaCard
                caption={card.caption}
                className={styles.venueCard}
                description={card.content}
                /*
                 * The footer is a **slot**, and the hours go in as separate nodes rather than one
                 * joined string — the card gaps them with `--media-card-footer-gap` and wraps them
                 * when they do not fit. That is the divergence the slot exists for: the other
                 * consumer of this card joins its footnote with a middot in its own renderer.
                 *
                 * No `size`, `color` or `weight`. The card's `.footer` owns all three — including the
                 * Regular weight, which the mono role would otherwise default to Medium and which is
                 * therefore the one a call site would get wrong by doing nothing.
                 *
                 * An empty array renders no footer *and no hairline*: `MediaCard` counts the slot
                 * with `Children.toArray`, so this is also the "card with no hours" case working by
                 * construction rather than by a branch here.
                 */
                footer={hours.map(({ key, text }) => (
                  <Text key={key} text={text} textTransform="uppercase" variant="mono" />
                ))}
                /*
                 * Spread whole. `MediaCardImage` is every prop `components/Image` takes for a Sanity
                 * asset less `className` and `fill`, so the projection object goes straight in and
                 * the section adds only the thing it alone knows: `sizes`, which depends on this
                 * grid. Half the container at two columns, all of it at one.
                 *
                 * The condition is a viewport width because that is the only thing `sizes` can ask
                 * about — a `sizes` media condition is evaluated against the viewport, never against
                 * a query container, so this can only ever approximate the real switch.
                 *
                 * `48rem` rather than a px value so it tracks the user's browser font size the way
                 * the `45rem` container switch does; a px threshold drifts away from the real switch
                 * the moment the root grows. `min(50vw, 720px)` because the container caps at
                 * `--container-xl`, so above a 1440 viewport the card stops growing while a bare
                 * `50vw` keeps climbing and requests a candidate twice the size it can use.
                 *
                 * Never `fill` — the type forbids it, because `ImageSanity` falls back to a static
                 * import carrying `width`/`height` and `next/image` throws on `width` with `fill`.
                 */
                image={card.image && { ...card.image, sizes: '(min-width: 48rem) min(50vw, 720px), 100vw' }}
                label={card.label}
                /*
                 * The per-card theme, straight through. `MediaCard` writes it as `data-theme` on its
                 * own root, which re-points the whole `[data-theme]` block beneath one element —
                 * fill, border, hairline, title ink, label accent and caption chip together.
                 *
                 * Not on the `<li>` and not on a wrapper: the card's own border and background are
                 * two of the things the theme has to move, and an attribute on an ancestor leaves
                 * them resolving against the section's theme instead.
                 */
                theme={card.theme}
                title={card.title}
                /*
                 * Derived from the section's own heading — see `cardTitleAs` above. The page outline
                 * is a property of the page, not of a per-card dropdown; but only a heading that
                 * actually renders may demote what sits under it.
                 */
                titleAs={cardTitleAs}
              />
            </li>
          );
        })}
      </ul>
    </Section>
  );
};

export default MediaCardGridSection;
