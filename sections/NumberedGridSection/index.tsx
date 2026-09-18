import type { FC } from 'react';

import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import formatOrdinal from '@/helpers/formatOrdinal';
import hasBlockContent from '@/helpers/hasBlockContent';
import stripTitleTags from '@/helpers/stripTitleTags';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { INumberedGridSection } from '@/tools/sanity/schema/sections/numberedGridSection';

import styles from './styles.module.scss';

/*
 * Hoisted out of the `map` below. `TextBlock` is a `'use client'` component, so a fresh object
 * literal per cell is nine identical objects serialised into the flight payload rather than one and
 * eight back-references. Nothing here is memoised, so there is no re-render cost either way — this
 * is payload, not renders.
 *
 * `size="sm"` is `--body-sm` = fluid(12px, 14px), which is the drawn pair exactly (12px at node
 * 16:322, 14px at 16:176).
 *
 * `spacing: 'xs'` is **not** a restatement of a default, and the routing is the reason. A
 * `blockContentSimple` field emits `normal` blocks, and `TextBlock`'s `normal` handler renders
 * `<Text as="p" {...config.span}>` — not `config.p`. `config.span` is built as
 * `{ size: 'md', spacing: 'md', ...providedConfig.p }`, so a caller passing only `size` inherits
 * `span`'s 16px inter-paragraph spacing rather than `p`'s 12px. That is 16px between paragraphs
 * inside a cell whose own stack gap is 8px — two rhythms in one box. `xs` is 8px, so the cell has
 * one.
 *
 * Invisible on the drawn content and reachable from the CMS, which is why it was measured rather
 * than read: `Text`'s spacing rules zero the padding on `:last-child`, and a one-paragraph
 * description is `:last-child`, so a single sentence renders identically either way. An editor
 * writing a second paragraph is what exposes it.
 */
const DESCRIPTION_CONFIG = { p: { size: 'sm' as const, spacing: 'xs' as const } };

const NumberedGridSection: FC<INumberedGridSection> = (props) => {
  const { title, meta, items } = props;

  /*
   * Filtered before numbering, not while rendering — which is the whole reason the filter is here
   * rather than a `&&` inside the `map`.
   *
   * `formatOrdinal` numbers from array position, so a blank cell left in the array would either draw
   * an empty bordered box with an ordinal in it or, if skipped inside the map, leave a *hole in the
   * numbering* — 01, 02, 04. `TwoColumnListSection` filters for the same reason and says so at
   * length. Done here rather than in the projection so a story passing raw mock data behaves exactly
   * like the CMS.
   *
   * The test is `stripTitleTags(...).text.trim()` and **not** `title?.trim()`. `title` arrives from
   * `TitleInput` as markup — `'<h3>Pool</h3>'` — so an emptied field is the string `'<h3></h3>'`,
   * which is truthy. Every cell an editor has ever touched would pass a bare `.trim()`. The schema's
   * own `custom()` rule strips the tags before testing; this mirrors it, so the two halves of the
   * same question agree.
   *
   * A cell with a tag and a description but no name is dropped rather than rendered nameless: the
   * name is the facility, and the other two only qualify it.
   */
  const cells = (items ?? []).filter((item) => Boolean(stripTitleTags(item?.title).text.trim()));

  const hasTitle = Boolean(stripTitleTags(title).text.trim());
  const hasMeta = Boolean(meta?.trim());

  /*
   * Nothing at all rather than an empty table.
   *
   * The grid paints a 1px outline on its own box, so rendering it with no cells publishes a bare
   * hairline rectangle — or, since a grid with no rows has no height, a single horizontal line under
   * the heading. `items` is `required().min(1)` in the schema, so the only way here is a half-built
   * section in the Studio's Presentation preview, where rendering nothing is the honest signal.
   * `ScheduleSection` and `TwoColumnListSection` both bail the same way.
   */
  if (cells.length === 0) {
    return null;
  }

  return (
    <Section
      name="NumberedGridSection"
      /*
       * The query container for both of the section's switches lives on the `Container` element —
       * see the head of `styles.module.scss`. `HeaderDisplaySection` wires it the same way.
       */
      containerClassName={styles.container}
      theme={getSectionTheme(props, 'light')}
      {...getSectionSpacingProps(props)}
      /*
       * **After** the spread, deliberately: `getSectionSpacingProps` returns a hardcoded
       * `spacing: 'lg'`, so a `spacing` written before it is silently dead and `yarn audit:layout`
       * reports exactly that ordering.
       *
       * `md` — `fluid(24px, 64px)` — measured against the drawn frames rather than picked. The
       * design draws 48px above the heading and 65px below the grid at 1282 (16:163's `pt-48`; the
       * page ends at 2206.9 against the grid's 2141.92) and 31.4px / 29px at 392 (16:310 starts at
       * 1213.4 against the venue cards' 1182.0; the page ends at 1992.7 against the grid's 1963.7).
       * The token resolves to 24.4 / 58.1 at those two widths — within ~7px at the narrow end and
       * ~10px at the wide one, and it is the only step that is close at *both*: `sm`
       * (`fluid(16, 48)`) is 15px short on the phone, `lg` (`fluid(40, 80)`) is 11px over.
       *
       * One step rather than a `[top, bottom]` pair: the drawn top and bottom differ by 3px on the
       * phone and 17px on the desktop, which is inside the error either way, and a tuple would claim
       * a precision the two measurements do not support.
       */
      spacing="md"
    >
      {(hasTitle || hasMeta) && (
        <div className={styles.heading}>
          {/*
           * `as="h2"` is forced rather than taken from the editor's choice in `TitleInput`, for the
           * same reason `HeaderDisplaySection` forces `h1` and `TwoColumnListSection` forces `h2`:
           * the page's outline is a property of the page. This section sits beneath a
           * `headerDisplaySection` on The Lodge, so h2 is the level and the cell names below are h3.
           *
           * `variant="display"` is the Archivo Black tier the heading is drawn in;
           * `size="md"` reads `--display-md`, which `.title` re-points — the global token reaches
           * 132px for a page header and this heading is drawn at 30px/48px.
           */}
          {hasTitle && (
            <TextTitle
              as="h2"
              className={styles.title}
              size="md"
              textTransform="uppercase"
              title={title}
              variant="display"
            />
          )}
          {/*
           * `variant="mono"` with no `weight`, which selects the role's quiet register — Medium at
           * 0.1em. That is the drawn pair exactly: JetBrains Mono Medium, 1.2px of tracking on 12px
           * (node 16:165). `size="xs"` is `--body-xs` = fluid(11px, 12px), so the wide anchor is the
           * drawn 12px exactly and the narrow one never shows — `.meta` hides this below the 38rem
           * container switch, which is a width of its own rather than one of the named viewport
           * breakpoints.
           *
           * `color="themeFgAccent"` rather than a `color` in the module, per the props-over-CSS
           * rule: `--fg-accent` is pine/600 on the light page, which is the `#1e4632` the node is
           * drawn in, and is the token `ScheduleSection.eyebrow`, `StatMeter` and `FieldCheckbox`
           * already use for exactly this ink. The ordinal and the tag in each cell take the same one,
           * and that is a reading rather than an inference: nodes 16:170 and 16:172 (desktop) and
           * 16:316 and 16:318 (mobile) all carry `#1e4632`, the same fill as this qualifier.
           *
           * On the dark theme it resolves to signal/300, a lime the design does not draw — which is
           * the objection `TwoColumnListSection.eyebrow` raises against this token, and the reason
           * that section takes `--fg-default` instead. The two are not in conflict: there, the
           * *design itself* draws a dark panel and sets its eyebrows in the panel's own off-white
           * ink, so the comp settles it. Here every drawn instance is on the light page and the dark
           * theme is a Studio radio rather than a frame, so the section takes the token that is
           * exactly right on the surface it is drawn on and inherits whatever that token says on the
           * other — which is what `ScheduleSection`, `StatMeter` and `PlayerCard` all do. Checked
           * with axe on both themes: no contrast violation either way — signal/300 on pine/600 is
           * 9.22:1.
           *
           * Worth saying out loud that this is 19 runs and not one: the qualifier here plus an
           * ordinal and a tag in every cell. The count does not change the argument — the token is
           * exactly right on the only surface the design draws, and the alternative would be picking
           * an ink for a frame that does not exist — but if the dark theme is ever actually used for
           * this section, this is the decision to revisit first.
           */}
          {hasMeta && (
            <Text
              as="p"
              className={styles.meta}
              color="themeFgAccent"
              size="xs"
              text={meta}
              textTransform="uppercase"
              variant="mono"
            />
          )}
        </div>
      )}
      {/*
       * `ol` and not `ul`: the ordinals are visible and the order carries meaning — reordering the
       * items renumbers them, which is the whole test for an ordered list.
       *
       * `role="list"` is not redundant. The global reset sets `list-style-type: none` on every `ol`,
       * and WebKit strips the `list` role from an unstyled list that does not claim it back, so
       * VoiceOver would announce these as loose text. `display: grid` is the second reason: it
       * replaces the list-item display type on the children, which drops the role in Chromium too.
       * Same reasoning as `components/Footer`, `HeaderDisplaySection`, `ScheduleSection` and
       * `TwoColumnListSection`.
       *
       * Deliberately **not** named with `aria-label`: the `<h2>` above is the visible label for
       * exactly this list, and duplicating CMS copy into the accessibility tree makes it drift the
       * moment an editor renames one and not the other. `aria-labelledby` would need a page-unique
       * id, and this is a server component with no `useId`.
       */}
      <ol className={styles.grid} role="list">
        {cells.map((item, index) => (
          <li className={styles.cell} key={item._key}>
            <div className={styles.cellHead}>
              {/*
               * `aria-hidden`, and this is the reason the ordinal is a real element rather than a
               * CSS counter.
               *
               * The ordinal is a *function of array position*, so it carries nothing the list order
               * does not already carry: for a sighted reader it is a scanning aid the design draws,
               * and for everyone else it is decoration. A `content: counter(…)` pseudo-element *is*
               * exposed in the accessibility tree by the CSSOM-AAM mapping, with no attribute that
               * can suppress it; a real span can take `aria-hidden` and keep the visible numbering.
               * `tools/helpers/formatOrdinal` records the argument once for the three sections that
               * share it.
               *
               * Note the narrower version of the claim those notes make — that the list "already
               * announces the position". Browsers do expose `posinset`/`setsize` on a list item, and
               * VoiceOver reads them, but `_reset.scss` removes the marker NVDA and JAWS take the
               * spoken number from, and nothing here sets `aria-posinset`. So on those two the
               * number is not announced twice; it is not announced at all. That does not change the
               * decision — decoration is still the right call for a number derived from order — but
               * if the numbering is ever deemed content, the mechanism is explicit `aria-posinset` /
               * `aria-setsize` on each `<li>`, not removing this attribute.
               *
               * The argument is the **zero-based** `map` index. `formatOrdinal` returns the
               * one-based, zero-padded string, so `index + 1` here would silently start the list at
               * 02 — that is the mistake the helper's signature exists to make obvious.
               *
               * `size="2xs"` is `--body-2xs` = fluid(10px, 11px), the drawn pair exactly: node
               * 16:170 sets the ordinal at 11px / 1.1px of tracking and 16:316 at 10px / 1px, both
               * of which are 0.1em, which is the mono role's quiet register. A rung below the
               * `size="xs"` the heading's qualifier takes, and that is the design's own step: the
               * qualifier is 12px against these 11px on the same frame. The tag beside it is the
               * same size — 16:172 and 16:318 carry the identical type.
               */}
              <Text ariaHidden as="span" color="themeFgAccent" size="2xs" text={formatOrdinal(index)} variant="mono" />
              {/*
               * Not `aria-hidden`: unlike the ordinal, the tag is information nothing else on the
               * page carries — "FROM 12PM", "BOOKINGS", "BYO SKILL".
               *
               * Not a `components/Tag` either, and the boundary is the drawn box: `Tag` is a chip
               * with a fill or a stroke and its own padding, and this label has neither. It is a
               * bare run of mono type right-aligned on the ordinal's line (node 16:172), identical
               * in every respect but position to the ordinal beside it — so it is the same `Text`
               * call, and giving it a border would invent a box the design does not draw.
               *
               * `alignment="right"` rather than `text-align` in the module, per the props-over-CSS
               * rule. It only shows on a tag long enough to wrap; the flex row's `space-between`
               * does the placement.
               */}
              {Boolean(item.tag?.trim()) && (
                <Text
                  alignment="right"
                  as="span"
                  className={styles.tag}
                  color="themeFgAccent"
                  size="2xs"
                  text={item.tag}
                  textTransform="uppercase"
                  variant="mono"
                />
              )}
            </div>
            {/*
             * `as="h3"` under the section's `<h2>`, forced for the same reason the heading above is.
             * `.cellTitle` re-points `--display-md` to the drawn 20px/26px pair — see the note
             * there for why the display tier is right for a 26px heading.
             *
             * The fallback to `h2` is the one reachable state where a fixed `h3` would skip a level:
             * `title` is `required()`, but a half-built draft in Presentation can hold a filled
             * `meta` and a blank heading, and then nine `h3`s would sit under no `h2` at all. axe
             * does not catch it — `heading-order` never fires on the first heading in a document —
             * and no story can, because every story has a title. Promoting the cells keeps the
             * outline contiguous instead, which is better than the alternative of bailing and
             * hiding content an editor *has* filled in.
             */}
            <TextTitle
              as={hasTitle ? 'h3' : 'h2'}
              className={styles.cellTitle}
              size="md"
              textTransform="uppercase"
              title={item.title}
              variant="display"
            />
            {/*
             * `hasBlockContent` and not `Boolean(content?.length)`: an editor who types into a
             * rich-text field and deletes it leaves one `normal` block holding an empty child, which
             * Sanity does not unset. `.length` is 1, `TextBlock` renders the empty `<p>`, and the
             * cell gains a dead line plus a flex gap.
             *
             * `color="themeFgMuted"` is the props-over-CSS form of the design's
             * `rgba(19,20,18,0.75)` — the measurement is recorded in `styles.module.scss`, where the
             * absent `.cellBody` rule explains why the description carries no class at all. The size
             * is on `DESCRIPTION_CONFIG` at the head of this file.
             */}
            {hasBlockContent(item.content) && (
              <TextBlock blocks={item.content} color="themeFgMuted" config={DESCRIPTION_CONFIG} />
            )}
          </li>
        ))}
      </ol>
    </Section>
  );
};

export default NumberedGridSection;
