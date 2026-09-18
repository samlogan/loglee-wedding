import Image from '@/components/Image';
import Link from '@/components/Link';
import Tag from '@/components/Tag';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import type { IFaqMapCard } from '@/tools/sanity/schema/sections/faqSection';

import styles from './styles.module.scss';

interface FaqMapCardProps extends IFaqMapCard {
  className?: string;
  /**
   * The theme the **bottom bar's contents** resolve against, which is the inverse of the page's.
   *
   * The bar is the design's ink chip — `--button-secondary-bg` / `-fg`, stone-900 under stone-50 on
   * a light page and the reverse on a dark one — so its label and its link sit on a surface that is
   * the opposite of everything around them. The label follows automatically (it is
   * `--button-secondary-fg`), but the "open in maps" link is drawn in the *accent*, and
   * `--fg-accent` is pine-600 on light and signal-300 on dark. Read from the page's own theme it
   * would be pine-600 on a stone-900 bar: 2.0:1, unreadable.
   *
   * Writing the flipped theme on the link itself re-points the whole `[data-theme]` block beneath
   * that one element, so `--fg-accent` resolves against the surface the link is actually on —
   * signal-300 on the ink bar, pine-600 on the off-white one. Both clear AA. The surrounding card
   * keeps the page's theme, which is why this is a prop on the link rather than an attribute on the
   * bar: putting it on the bar would flip `--button-secondary-bg` too and the ink chip would
   * un-invert itself.
   */
  accentTheme: ProjectTheme;
}

/**
 * The compact map card in the FAQ's left rail — nodes 16:643 (desktop) and 16:799 (mobile).
 *
 * ## Deliberately local, and deliberately replaceable
 *
 * There is no shared `Map` component in this repo, and a full-width map section remains undesigned,
 * so building one from a single 260px card would be inventing the general case from one example. The
 * card is instead three things this repo already owns — `components/Image`, `components/Tag`,
 * `components/Link` — arranged by a stylesheet, plus an `<iframe>` fallback for an embed URL.
 *
 * When a shared map *does* land, this is the seam: the schema object (`IFaqMapCard`) is five fields
 * an editor fills in, and the only thing this file contributes is the arrangement. Swapping the
 * `.mapMedia` block for `<Map variant="compact" …>` leaves the badge, the bar and every token in
 * place.
 *
 * ## Overlay order is stated, not inherited
 *
 * The badge and the bar are `position: absolute` over the media, and `components/Image` wraps its
 * `<img>` in a `position: relative` container — so both the image and the overlays are positioned
 * elements painting in tree order, and the overlays would win by being later. That is true and it is
 * *fragile*: it is a property of the order these three JSX nodes happen to be written in. The
 * stylesheet gives the overlays an explicit `z-index`, and the story asserts the result with
 * `elementFromPoint` rather than by eye.
 */
const FaqMapCard = (props: FaqMapCardProps) => {
  const { accentTheme, address, badge, className, embedUrl, image, link } = props;

  /*
   * Image first, embed second, nothing third — the precedence the schema's docblock states.
   *
   * `image?.asset?.url` and not `image`, because a Sanity image field that an editor opened and
   * cleared still projects as `{ asset: null, altText: null, … }`: a truthy object with no picture
   * in it. `components/Image` already returns `null` for that, so testing the object alone would
   * suppress the embed *and* render nothing.
   */
  const hasImage = Boolean(image?.asset?.url);
  const hasEmbed = !hasImage && Boolean(embedUrl);
  const linkLabel = link?.label?.trim();
  const hasBar = Boolean(address?.trim()) || Boolean(linkLabel);

  if (!(hasImage || hasEmbed || badge?.trim() || hasBar)) {
    return null;
  }

  return (
    <div className={classNames(styles.mapCard, className)}>
      {hasImage && image && (
        /*
         * `sizes` is stated rather than left to `components/Image`'s default, which assumes a
         * three-up grid (`33vw` at desktop). This card is a fixed rail: the full column width below
         * the stack point and 440px above it (node 16:643). Getting it wrong costs bandwidth on
         * every page load rather than anything visible, which is why it is easy to leave wrong.
         */
        <Image {...image} sizes="(max-width: 1024px) 100vw, 440px" />
      )}
      {hasEmbed && (
        /*
         * `title` is the frame's accessible name and is **required** — an untitled iframe is an
         * unnamed landmark that a screen reader announces as "frame", with no way to know whether
         * entering it is worth it (WCAG 4.1.2). The address is the most useful name available;
         * `badge` is the fallback and a bare "Map" the last resort.
         *
         * `loading="lazy"` because the card is below the fold on both comps, and the embed is a
         * third-party document — the single heaviest thing this section can pull in.
         */
        <iframe
          className={styles.mapEmbed}
          src={embedUrl}
          title={address?.trim() || badge?.trim() || 'Map'}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
      {/*
       * The corner chip, filled — `components/Tag`'s own note is explicit that a chip over media
       * must be `filled`, because the opaque surface is what makes the label's contrast a property
       * of the chip rather than of whichever pixel of map lands underneath it.
       *
       * No `uppercase`: the drawn label is "MAP · Sydney → Jamberoo, 90 min" — mixed case on purpose
       * — so it is reproduced exactly as typed. `Tag` returns `null` for a blank label, so the
       * guard here is only to keep the DOM clean.
       *
       * `weight="regular"` because node 16:645 is JetBrains Mono **Regular**, where `Tag`'s default
       * is the mono role's Medium. Same for the note chip in `FaqItems`; the address beside it in
       * the bar really is Bold, so the three are not one decision.
       *
       * `className` carries placement and nothing else, which is the contract `Tag`'s stylesheet
       * sets out.
       */}
      {Boolean(badge?.trim()) && (
        <Tag className={styles.mapBadge} label={badge} size="sm" variant="filled" weight="regular" />
      )}
      {hasBar && (
        <div className={styles.mapBar}>
          {Boolean(address?.trim()) && (
            <Text
              as="span"
              className={styles.mapAddress}
              text={address}
              textTransform="uppercase"
              variant="mono"
              size="2xs"
              weight="bold"
            />
          )}
          {Boolean(linkLabel) && (
            /*
             * `variant="bare"` is the design's boxless mono control: it zeroes the padding the size
             * axis would otherwise add and holds the 24px pointer target WCAG 2.5.8 asks of a
             * standalone control, through an absolutely-positioned `::after` that grows the hit area
             * without moving the box. `arrow="right"` draws the comp's "→" as the component's own
             * decorative glyph rather than as copy an editor has to remember to type.
             *
             * **No `size`.** `bare` discards every property the size axis sets — it zeroes the
             * padding at a higher specificity and the icon size is unused — so a `size` here would
             * imply the 11px type came from the button ladder when it comes from `--body-2xs`, the
             * type-scale rung the address beside it is also on. See the stylesheet.
             *
             * `data-theme` rides through `Link`'s `...rest` spread onto the `<a>` — see the note on
             * `accentTheme` above for why the flip belongs on this element and not on the bar.
             */
            <Link
              {...link?.link}
              className={styles.mapLink}
              data-theme={accentTheme}
              variant="bare"
              mono
              arrow="right"
              text={linkLabel}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FaqMapCard;
