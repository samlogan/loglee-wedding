import type { FC } from 'react';

import MediaCard from '@/components/MediaCard';
import Section from '@/components/Section';
import Text from '@/components/Text';
import hasBlockContent from '@/helpers/hasBlockContent';
import stripTitleTags from '@/helpers/stripTitleTags';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type {
  ISpecCardGridSection,
  ISpecCardGridSectionCard
} from '@/tools/sanity/schema/sections/specCardGridSection';

import styles from './styles.module.scss';

/**
 * The separator the CMS never stores.
 *
 * Authoring "Extra beds at a charge · Cot free" as one string would let two editors punctuate two
 * cards two different ways within a week — a middot here, a bullet there, an em dash on the third —
 * and nothing would ever flag it. Holding the items and joining them here makes the separator a
 * property of the design, changeable in one place. It is a middot with a space either side on every
 * drawn card (nodes 1:643, 1:656, 1:668).
 *
 * The spaces also do the accessibility work: a bare `·` between two runs is announced by most
 * screen readers as nothing at all, which would run the two items together into one phrase. With
 * spaces the boundary survives as a pause.
 */
const FOOTNOTE_SEPARATOR = ' · ';

/**
 * What `next/image` should ask the CDN for, at the widths the grid actually resolves to.
 *
 * Worth writing out rather than leaving to `components/Image`'s generic default, which switches at
 * 768/1200 and so asks for a full-viewport source through the whole two-up band — roughly four times
 * the pixels needed.
 *
 * **`sizes` can only be a viewport query, while the track count is a container query**, so these are
 * the viewport widths at which the section's container crosses its own thresholds on a full-width
 * page: 608px of content sits inside a ~660px viewport and 960px inside a ~1025px one, once
 * `--container-gutter` (`fluid(20px, 40px)`) is added back on both sides. A section dropped into a
 * narrower column would over-fetch, which is the safe direction to be wrong in — `sizes` is a hint,
 * and the failure mode of the other direction is a visibly soft photograph.
 *
 * The last entry is a fixed `440px` rather than a percentage because `Container` caps at
 * `--container-xl` (1440px): past that the column stops growing, and `33vw` would keep asking for a
 * larger source on an ultrawide display that cannot show it.
 */
const IMAGE_SIZES = '(max-width: 659px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 440px';

/**
 * The footnote items an editor actually filled in, trimmed and in order.
 *
 * A `reduce` rather than `.map(trim).filter(Boolean)`, following `twoColumnListSection`: the filter
 * form needs a `(item): item is string` predicate to narrow `(string | undefined)[]` back to
 * `string[]`, and oxlint's `unicorn/prefer-native-coercion-functions` rejects that as "equivalent to
 * `Boolean`" — which it is not, since `Boolean` carries no type predicate. The reduce keeps the
 * narrowing and the lint rule both happy, and it trims once rather than twice.
 */
const footnotesOf = (card: ISpecCardGridSectionCard): string[] =>
  (card.footnotes ?? []).reduce<string[]>((accumulator, item) => {
    const text = item?.trim();

    if (text) {
      accumulator.push(text);
    }

    return accumulator;
  }, []);

/**
 * Does this card hold anything?
 *
 * An array of objects keeps every row an editor added and moved on from, and a blank one renders as
 * a bordered box of padding with nothing in it — `components/MediaCard` drops the band, the header,
 * the description and the footer independently, so an empty card is a visible empty rectangle rather
 * than nothing. Filtered here rather than in the projection so a story passing raw mock data behaves
 * exactly like the CMS.
 *
 * `stripTitleTags(...).text` and not `title?.trim()`: `TitleInput` stores markup, so an emptied field
 * is the string `'<h2></h2>'` — truthy, and non-empty after `trim()`. `hasBlockContent` rather than
 * `description?.length` for the mirror-image reason: an editor who types into a rich-text field and
 * deletes it leaves one block holding an empty child, which Sanity does not unset.
 *
 * `image?.asset?.url` and not `image`, matching the card's own guard — `components/Image`
 * early-returns on a falsy url, so an image object with no asset is not a reason to draw a card.
 */
const hasCardContent = (card: ISpecCardGridSectionCard): boolean =>
  Boolean(card.image?.asset?.url) ||
  Boolean(stripTitleTags(card.title ?? '').text.trim()) ||
  Boolean(card.label?.trim()) ||
  hasBlockContent(card.description) ||
  footnotesOf(card).length > 0;

const SpecCardGridSection: FC<ISpecCardGridSection> = (props) => {
  const { cards } = props;

  /*
   * The footnote is joined here rather than in the JSX so `footnotesOf` runs once per card instead
   * of twice — once to ask whether there is a footer and once to build it. The joined string doubles
   * as the emptiness test, which is the shape the card wants anyway: it counts its footer children
   * with `Children.toArray`, and `''` is a child while `null` is not.
   */
  const items = (cards ?? [])
    .filter((card) => hasCardContent(card))
    .map((card) => ({ card, footnote: footnotesOf(card).join(FOOTNOTE_SEPARATOR) }));

  /*
   * Nothing at all rather than an empty shell, for the reason `twoColumnListSection` and
   * `scheduleSection` both give: the section's only content is the grid, so returning the `Section`
   * with no cards publishes a strip of padding. `cards` has no `required()`, so the only way here is
   * a half-built section in the Studio's Presentation preview — where rendering nothing is the
   * honest signal.
   */
  if (items.length === 0) {
    return null;
  }

  return (
    <Section
      name="SpecCardGridSection"
      theme={getSectionTheme(props, 'light')}
      /*
       * The query container for the grid's two switches is the `Container` element, not the grid —
       * so the queried inline size is the content box the tracks actually divide. See the note at
       * the top of `styles.module.scss`.
       */
      containerClassName={styles.container}
      {...getSectionSpacingProps(props)}
      /*
       * **After** the spread, deliberately: `getSectionSpacingProps` returns a hardcoded
       * `spacing: 'lg'`, so a `spacing` written before it is silently dead and `yarn audit:layout`
       * reports exactly that ordering.
       *
       * The pair is measured off both frames rather than chosen. **Top is zero on both**: on desktop
       * the grid container (1:630) has `pb-[48px]` and no top padding, and on mobile the first card
       * sits at `y=0` inside its container (1:700). The gap a reader sees above the cards is the
       * page header's own bottom padding — the convention every band on these pages follows, and the
       * one `scheduleSection` and `twoColumnListSection` both state.
       *
       * Bottom is drawn 48px desktop (1:630) and 24px mobile (1:700 is 1064 tall and its last card
       * ends at 1040). The drawn pair extrapolates to about `fluid(24px, 52px)` on the scale's own
       * 375→1440 anchors, and **no token is that pair**. Measured in the browser rather than
       * calculated:
       *
       *                     375px    1280px   1440px
       *   drawn               24        48        —
       *   `sm` (this)         16        43.2      48
       *   `md`                24.9      57.6      64
       *
       * `sm` is the choice because its worst case is 7px under at the phone while `md`'s is 16px
       * over at the desktop anchor, and because `sm` is exactly what the band immediately above this
       * on `/stay` (`headerDisplaySection`) already uses — so the page keeps one rhythm rather than
       * two. The phone shortfall is the known cost, and it is a cost rather than a bug: there is no
       * per-breakpoint section spacing, and hand-writing the padding here would take the editor's
       * remove-spacing toggles out of the loop.
       *
       * The editor's two remove-spacing toggles stay wired through the spread. `removeTopSpacing`
       * has nothing to remove today, and dropping the spread to say so would take the control away
       * from a future page that puts this grid somewhere the rhythm differs, for no gain.
       */
      spacing={['none', 'sm']}
    >
      {/*
       * A list, because three room types are three of a kind and a screen-reader user is better off
       * knowing how many there are before reading the first one.
       *
       * `role="list"` is not redundant. The global reset sets `list-style-type: none` on every `ul`,
       * and WebKit strips the `list` role from an unstyled list that does not claim it back, so
       * VoiceOver would announce these as loose text. `components/Footer`, `headerDisplaySection`
       * and `twoColumnListSection` all carry the same attribute for the same reason.
       *
       * `ul` and not `ol`: the editor's order is the reading order, but nothing about a room is
       * *ordinal* — reordering the grid does not change what it says, which is the whole test.
       *
       * Deliberately unnamed. There is no section heading to point `aria-labelledby` at, and an
       * `aria-label` here would be copy invented in the component that no editor can see or change.
       */}
      <ul className={styles.grid} role="list">
        {items.map(({ card, footnote }) => (
          /*
           * Keyed by `_key`, the identity Sanity already maintains for an array member. The two
           * alternatives are both wrong in a way that only shows up on an edit: the array index
           * makes React keep the previous card's DOM — including its loaded photograph — when an
           * editor reorders, and the room name is only unique at publish time, so a draft mid-rename
           * hands React duplicate keys. `twoColumnListSection` has to work around exactly that
           * because its items are bare strings with no key of their own; these are objects, and do.
           */
          <li className={styles.item} key={card._key}>
            <MediaCard
              caption={card.caption}
              description={card.description}
              /*
               * **One node, joined here.** `components/MediaCard`'s footer is a slot rather than a
               * list precisely so that this section can join with a middot while `/the-lodge` lays
               * its opening hours out as separate items — a `separator` prop would have had to model
               * both and been wrong for the third case.
               *
               * `null` and not the empty string when there is nothing to show: the card counts its
               * footer with `Children.toArray`, which drops `null` but keeps a string, and the
               * hairline belongs to the footer — so a falsy-but-present child would draw a rule with
               * nothing under it.
               *
               * No `size`, `color` or `weight`. The card's `.footer` owns all four, including the
               * Regular weight the mono role would otherwise default to Medium, and passing any of
               * them here is how a call site silently drifts off the comp.
               */
              footer={footnote ? <Text text={footnote} textTransform="uppercase" variant="mono" /> : null}
              /*
               * Spread straight through, plus the one thing only this section knows: how wide the
               * column will be. **Never `fill`** — `MediaCardImage` omits the key because
               * `components/Image` falls back to a static import carrying `width`, and `next/image`
               * throws on `width` together with `fill`, so a card whose asset is missing or
               * mid-upload would crash rather than show the placeholder.
               *
               * No `priority`. This grid is a page-builder section that can sit anywhere, so it
               * cannot know it is above the fold; on `/stay` it is not — the display header is.
               */
              image={card.image && { ...card.image, sizes: IMAGE_SIZES }}
              label={card.label}
              title={card.title}
              /*
               * The level is forced rather than taken from the editor's choice in `TitleInput`, for
               * the reason `headerDisplaySection` forces `h1` and `twoColumnListSection` forces
               * `h2`: the page's outline is a property of the page, and a grid whose cards were
               * three different levels would be a worse outline than any single wrong choice.
               *
               * `h2` and not the `h3` the mobile frame's layer name suggests. The section has no
               * heading of its own, so the cards are the first level under the page `<h1>` — and on
               * `/stay` the band immediately after this one renders an `<h2>` ("The rooms are
               * sorted"), so `h3` here would be a skipped level followed by the level it skipped.
               * The file's own evidence is weak either way: the desktop frame names the same row
               * "Paragraph" (1:636) while the mobile one names it "Heading 3" (1:707).
               */
              titleAs="h2"
            />
          </li>
        ))}
      </ul>
    </Section>
  );
};

export default SpecCardGridSection;
