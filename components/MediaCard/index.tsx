import { Children } from 'react';
import type { ReactNode } from 'react';

import Image from '@/components/Image';
import type { ImagePropsSanity } from '@/components/Image';
import Link from '@/components/Link';
import Tag from '@/components/Tag';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import classNames from '@/helpers/classNames';
import hasBlockContent from '@/helpers/hasBlockContent';
import hasDestination from '@/helpers/hasDestination';
import stripTitleTags from '@/helpers/stripTitleTags';
import type { ILinkElement } from '@/tools/sanity/schema/elements/link';

import styles from './styles.module.scss';

/**
 * Everything `components/Image` accepts for a Sanity asset, less the two keys this component owns.
 *
 * Typed as the whole prop set rather than as `SanityImageAdvanced` so that the projection shape
 * (`asset`, `altText`, `aspectRatio`, `crop`, `hotspot`) spreads in directly **and** a consuming
 * section can add the two things only it knows: `sizes`, which depends on the grid the card is
 * dropped into, and `priority` for a card above the fold. One prop, no per-knob pass-throughs.
 *
 * `className` is removed because the card owns the media band's own class. `fill` is removed because
 * it is unusable here: `ImageSanity` falls back to a static import carrying `width`/`height`, and
 * `next/image` throws on `width` together with `fill`, so a missing asset would crash the card
 * rather than showing the placeholder. See the call site.
 */
export type MediaCardImage = Omit<ImagePropsSanity, 'className' | 'fill'>;

export interface MediaCardProps {
  className?: string;
  /**
   * Makes the whole card a link. The title is the link — so a screen reader announces one link
   * named for the card, not every word in it — and a transparent layer stretched from it covers the
   * card, so a click anywhere lands on it. Needs a title to hang on; ignored without one, and
   * ignored when it resolves nowhere (`hasDestination`).
   */
  link?: ILinkElement | null;
  /**
   * The chip inset at the bottom-left of the media panel — a `Tag`, and the only boxed thing on the
   * card.
   *
   * Sentence case / verbatim from the CMS: `Tag` applies no `text-transform` here, deliberately,
   * because the design fills this with file names (`king-room.jpg`) as often as with prose
   * (`IMAGE · lulus-interior.jpg · ceiling murals`) and a file name has to be reproduced as stored.
   *
   * Rendered only when there is a media panel to inset it into. A caption with no image is a chip
   * floating on nothing.
   */
  caption?: string | null;
  /**
   * The body copy, as Portable Text.
   *
   * Rich text rather than a plain string because both consuming tickets specify `TextBlock` for it,
   * and because a `string` field cannot carry the inline link the copy will eventually want. The
   * card owns the type (`--body-md` at `--body-line-height`, `--fg-default`) and the paragraph
   * rhythm; a section passes the projection's array straight through.
   *
   * Guarded with `hasBlockContent`, not `.length` — an editor who types and then deletes leaves one
   * `normal` block holding an empty child, and `TextBlock`'s own guard renders that as an empty
   * `<p>` rather than nothing. See the helper's note.
   */
  description?: SanityTextBlock[] | null;
  /**
   * The row under the hairline. **A slot, not a list**, and that is the one real divergence between
   * the two sections this card was factored out of: one joins its footnote items with a middot in
   * its own renderer, the other lays its opening hours out as separate inline items. A `separator`
   * prop would have had to model both and would be wrong for the third.
   *
   * The card owns the frame — the rule above it, the space, the `--fg-accent` ink, the `--body-xs`
   * step, the mono role's leading and its weight — so a section passes bare `<Text variant="mono">`
   * runs with no `size`, no `color` and no `weight` and inherits all of it. The slot is a wrapping
   * flex row, so several items gap apart without the section styling anything.
   *
   * The weight is worth naming because it is the one a call site would get wrong by doing nothing:
   * every footnote in the design is JetBrains Mono **Regular** (`1:643`, `16:147`, `16:162`) and the
   * mono role's own default is Medium. The stylesheet re-points it on `.footer`, so the correct
   * weight is what a bare run already renders — pass `weight` only to deviate from the comp.
   *
   * Counted with `Children.toArray`, which drops `null`, `undefined` and booleans and flattens
   * arrays — so `footer={items.map(…)}` on an empty array renders no rule rather than an empty one.
   * A bare `Boolean([])` is `true` and would have drawn a hairline with nothing under it.
   */
  footer?: ReactNode;
  /**
   * The media panel. Landscape, bleeding to the inner edge of the border on three sides.
   *
   * The card fixes the panel's height (`--media-card-media-height`) and covers, which is what makes
   * a row of cards line up: an intrinsic aspect ratio would make the body's start position depend on
   * the photograph. Any `aspectRatio` on the passed object is therefore overridden — see the
   * stylesheet.
   */
  image?: MediaCardImage | null;
  /**
   * The short mono run right-aligned against the title — the room's capacity, the venue's category.
   *
   * **Unboxed.** Only chips the design draws a box around are a `Tag`; this one is drawn as bare
   * type in `--fg-accent` and must not gain a border. Uppercased in CSS, so the stored string stays
   * sentence case for assistive technology.
   */
  label?: string | null;
  /**
   * Writes `data-theme` on the card root, which re-points the whole `[data-theme]` block in
   * `_variables.scss` beneath it — the card's fill, its border, the hairline's strength, the body
   * ink, the label's accent and the caption chip all follow, because nothing in the stylesheet names
   * a colour. It is the same inversion `sections/TwoColumnListSection` applies to its inset panel,
   * applied to a card.
   *
   * This is what makes a per-card light/dark grid a one-prop change rather than a second component.
   * Omit it and the card inherits whatever theme its section or the page set, which is the right
   * default and the one a single-theme grid wants.
   *
   * One thing is derived from it rather than from the cascade: the caption chip takes `Tag`'s
   * `bordered` treatment when `theme === 'dark'` — the hairline the design draws on node 16:152,
   * where a dark chip sits on a dark photograph and the fill alone does not separate the two. A card
   * that inherits dark from an ancestor instead of declaring it keeps the plain chip; if that case
   * ever gets drawn, promote this to a prop rather than reading the computed theme.
   */
  theme?: ProjectTheme;
  /**
   * The name, as the markup string `TitleInput` stores (`<h3>KING ROOM</h3>`).
   *
   * Tags are stripped and the element is taken from them, so an editor choosing the heading level
   * still chooses it. `titleAs` overrides when the section knows better than the field does.
   */
  title?: string | null;
  /** Forces the heading level, for a grid sitting under a section heading of its own. */
  titleAs?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span';
}

/**
 * The bordered media card drawn on `/stay` and `/the-lodge` — Figma nodes `1:631`, `1:644`, `1:657`
 * (rooms, desktop), `1:701`/`1:713`/`1:725` (rooms, mobile) and `16:135`, `16:150` (venues).
 *
 * Verified node by node: those five desktop instances are **one drawn component**, not two that
 * resemble each other. What differs between the two pages is three numbers (body padding, title
 * size, media height) and what goes in the footer — which is why the numbers are custom properties
 * and the footer is a slot, rather than either being a variant.
 *
 * ## What it owns, and what it deliberately does not
 *
 * It owns the shell: the border, the radius, the clipped corners, the media band, the chip's
 * placement, the header row, the body type, the hairline and the footer frame. It stretches
 * (`height: 100%` plus `margin-block-start: auto` on the footer) so that a row of cards with unequal
 * copy bottom-aligns its footers.
 *
 * It owns **no grid, no column count and no breakpoint behaviour.** Those stay in the consuming
 * section, which is the boundary that lets two sections use this without negotiating. A section
 * composes a stretching row with nothing more than:
 *
 *   .grid {
 *     display: grid;
 *     grid-template-columns: repeat(3, minmax(0, 1fr));
 *     gap: var(--spacing-xl);
 *     align-items: stretch;      // the grid default, stated because it is the load-bearing half
 *
 *     @include media-down(tablet) { grid-template-columns: 1fr; }
 *   }
 *
 * `minmax(0, 1fr)` rather than `1fr`: a `1fr` track has a `min-width: auto` floor, so one long
 * unbreakable word in a title pushes the whole row wider than its container.
 *
 * ## Not `components/Card`
 *
 * That component is unused boilerplate with zero importers, built around a stretched link overlay
 * and an `href`/`ariaLabel` union. Neither of these cards is a link, and nothing here is focusable —
 * the card is a plain `<div>` with a heading in it.
 */
const MediaCard = (props: MediaCardProps) => {
  const { caption, className, description, footer, image, label, link, theme, title, titleAs } = props;

  /*
   * `stripTitleTags(...).text`, not `title?.trim()`.
   *
   * `TitleInput` stores markup, so an emptied field is the string `'<h3></h3>'` — truthy, non-empty
   * after `trim()`, and rendered as an empty heading that still takes a line box in the header row.
   * `sections/TwoColumnListSection` documents the same trap; this is the same field type.
   */
  const { as: markupAs, text: titleText } = stripTitleTags(title ?? '');
  const headingText = titleText.trim();
  const labelText = label?.trim();
  const captionText = caption?.trim();

  /*
   * Narrowed to a value rather than tested as a boolean, so the spread below type-checks against
   * `ImagePropsSanity` — and `url` rather than `asset`, because `components/Image` early-returns
   * `null` on a falsy url. Without this the media band and its caption would still draw: a fixed
   * height of empty surface with a chip stuck to the bottom of it.
   */
  const media = image?.asset?.url ? image : undefined;
  const hasHeader = Boolean(headingText) || Boolean(labelText);
  /*
   * Flattens arrays and drops `null` / `undefined` / booleans, so the three shapes a section
   * actually passes — a mapped array, a conditional, a single node — all answer correctly. An empty
   * mapped array is the case that matters: the hairline is part of the footer, so an empty slot must
   * render nothing at all rather than a rule with a gap under it.
   */
  const hasFooter = Children.toArray(footer).length > 0;
  const isLinked = Boolean(headingText) && hasDestination(link);

  return (
    <div
      className={classNames(styles.card, { [styles.linked]: isLinked }, className)}
      {...(theme && { 'data-theme': theme })}
    >
      {media && (
        <div className={styles.media}>
          {/*
           * `aspectRatio="natural"` is written **after** the spread, so the card's band height wins
           * over whatever the CMS set on the asset. That is deliberate: the media panel's height is
           * what puts every body in a row at the same y, and an editor who picks `1-1` on one card
           * should not stagger the row. `natural` is the only ratio class that adds no
           * `padding-bottom`, which leaves `.media`'s own height as the only thing sizing the band.
           *
           * **Not `fill`**, and that is a trap worth naming rather than rediscovering.
           * `components/Image/ImageSanity` spreads the *static* fallback import — `{ src, width,
           * height, blurDataURL }` — whenever `useNextSanityImage` cannot resolve the asset, and
           * `next/image` throws outright on `width` together with `fill`. So a card with `fill`
           * renders fine against a real Sanity asset and hard-crashes the moment the asset is
           * missing, a Storybook mock, or a draft mid-upload. `MediaCardImage` omits the key so no
           * call site can reintroduce it; the stylesheet sizes the image with `width`/`height: 100%`
           * from `Image`'s own rules instead, which needs no positioning and cannot throw.
           */}
          <Image {...media} aspectRatio="natural" />
          {captionText && (
            <Tag
              bordered={theme === 'dark'}
              className={styles.caption}
              label={captionText}
              size="sm"
              weight="regular"
            />
          )}
        </div>
      )}

      <div className={styles.body}>
        {hasHeader && (
          <div className={styles.header}>
            {headingText && (
              <Text
                as={titleAs || markupAs}
                className={styles.title}
                text={isLinked ? undefined : headingText}
                /*
                 * Capitals from CSS, which is how every display heading in this repo is set
                 * (`HeaderDisplaySection` passes the same prop). The *stored* string stays sentence
                 * case, and that is the half that matters: Chromium names an element from its
                 * rendered text, so `text-transform` does not keep capitals out of the accessibility
                 * tree — only authoring in sentence case does.
                 */
                textTransform="uppercase"
                /*
                 * The display *face* at a size the display *tier* does not have — Archivo Black at
                 * 26→30px (rooms) or 40px (venues), against `--display-md`'s 56→132px. `variant`
                 * carries the family and the 900 weight; `size` is omitted so no `.size_*` rule fires
                 * and `.title` sets the three metrics itself. That is the same escape hatch the mono
                 * variant documents for call sites drawn at a pair that is not on the scale.
                 *
                 * `Text` rather than `TextTitle`, for the reason `ScheduleSection` gives at its own
                 * title: `TextTitle` forwards `variant`/`size` only and defaults `size` to `md`, so
                 * it cannot express "display family, off-scale size" — `size="md"` would resolve
                 * `--display-md` and set the card title at 132px. The tag-stripping `TextTitle`
                 * exists for is done above with the same exported helper, so nothing is lost.
                 */
                variant="display"
              >
                {isLinked && (
                  <Link {...link} className={styles.titleLink}>
                    {headingText}
                  </Link>
                )}
              </Text>
            )}
            {labelText && (
              <Text className={styles.label} size="2xs" text={labelText} textTransform="uppercase" variant="mono" />
            )}
          </div>
        )}

        {hasBlockContent(description) && (
          <TextBlock
            blocks={description ?? undefined}
            /*
             * `p` also sets `span`: `TextBlock` spreads `providedConfig?.p` into both, and `normal` —
             * the only style any `blockContent` schema emits — routes through `span`. Setting `span`
             * here instead would miss the `p` handler, and setting both would be the same object
             * twice.
             *
             * `sm` rather than the `md` default so that the gap between two paragraphs sits nearer
             * the card's own `--media-card-gap` than to a page's paragraph rhythm. Zeroed on the last
             * child by `Text`'s own rule, so it never doubles up with the hairline's space.
             */
            config={{ p: { spacing: 'sm' } }}
          />
        )}

        {hasFooter && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
};

export default MediaCard;
