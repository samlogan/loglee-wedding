import type { FC } from 'react';

import Image from '@/components/Image';
import Section from '@/components/Section';
import Tag from '@/components/Tag';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IMediaTagsSection } from '@/tools/sanity/schema/sections/mediaTagsSection';

import styles from './styles.module.scss';

const MediaTagsSection: FC<IMediaTagsSection> = (props) => {
  const { image, caption, tags } = props;

  /*
   * Trimmed, blanks dropped, duplicates disambiguated — the same three passes
   * `TwoColumnListSection` makes over its `items`, and for the same reasons, stated once here.
   *
   * A blank pill is not nothing: `Tag` paints an opaque surface with 12×8 of padding, so an entry
   * an editor tabbed through and left empty draws a small filled rectangle over the photograph with
   * no label in it. `Tag` self-guards, but it guards by returning `null` from *inside* the `<li>`,
   * which would leave an empty list item taking a flex gap.
   *
   * The key is carried rather than derived at render. These are short lines an editor reorders in
   * place, so an index key makes React keep the old text in the old node on a reorder. `tags`
   * carries `Rule.unique()`, but that is publish-time and Presentation renders drafts — so a draft
   * mid-edit really can hold two identical pills, and a bare `key={tag}` hands React duplicate keys
   * in the one environment an editor is watching. Suffixing by occurrence leaves the common case
   * byte-identical and makes the degenerate one merely ugly.
   */
  const seen = new Map<string, number>();
  const pills = (tags ?? []).reduce<{ key: string; text: string }[]>((accumulator, tag) => {
    const text = tag?.trim();

    if (!text) {
      return accumulator;
    }

    const occurrence = seen.get(text) ?? 0;
    seen.set(text, occurrence + 1);
    accumulator.push({ key: occurrence === 0 ? text : `${text}#${occurrence}`, text });

    return accumulator;
  }, []);

  const captionText = caption?.trim();

  /*
   * Nothing at all rather than an empty frame.
   *
   * The frame is a fixed-ratio box with a radius and `overflow: clip`; with no image behind it,
   * publishing it draws a blank rounded rectangle with two chips floating in it. `image` is
   * `required()` in the schema, so the only way here is a half-built section in the Studio's
   * Presentation preview — where rendering nothing is the honest signal. `components/Image` makes
   * the same call on the same condition (`!asset?.url` returns `null`) and `ScheduleSection` and
   * `TwoColumnListSection` both bail this way.
   *
   * Tested on `asset?.url` rather than on `image`, because that is the field `Image` itself tests:
   * a projection whose asset reference has been broken returns a shaped object with null leaves,
   * which is not nullish.
   */
  if (!image?.asset?.url) {
    return null;
  }

  return (
    <Section
      name="MediaTagsSection"
      theme={getSectionTheme(props, 'light')}
      containerClassName={styles.container}
      {...getSectionSpacingProps(props)}
      /*
       * **After** the spread, deliberately: `getSectionSpacingProps` returns a hardcoded
       * `spacing: 'lg'`, so a `spacing` written before it is silently dead and `yarn audit:layout`
       * reports exactly that ordering.
       *
       * `none`, and it is measured rather than a shortcut. The frame draws **zero** gap below it —
       * this block ends at y = 901.75 on node 16:102 and the venue cards begin at 901.75, with the
       * 484.22 / 484.22 pair saying the same thing on mobile (16:267). Above it there are 36.3px,
       * and those are already paid for: `HeaderDisplaySection` sits directly above on this page and
       * carries `spacing="sm"`, which measures 43.2px at a 1280px viewport. Adding a step here would
       * stack a second gap on top of the one the design draws — the convention every section on
       * these pages follows, and the one `TwoColumnListSection` sets out at length.
       *
       * The editor's two remove-spacing toggles therefore have nothing to remove. They stay wired:
       * dropping the spread would take them away from a future page that puts this section
       * somewhere the rhythm differs, for no gain.
       */
      spacing="none"
    >
      {/*
       * A `<figure>`, because that is what this is: one piece of media with a caption for it. The
       * caption is the `<figcaption>` and must therefore be the first or last child — first here, so
       * DOM order matches the reading order a sighted reader gets (the chip is in the top corner).
       *
       * Its *placement* comes from the stylesheet, because both overlays are absolute. Its **paint
       * order** does not, and conflating the two is what made this chip ship invisible: `Image`'s
       * wrapper is `position: relative`, so all three children were positioned at `z-index: auto`
       * and painted in tree order — putting the opaque photograph on top of the figcaption that has
       * to come first. `styles.module.scss` now states `z-index` on both overlays, so the stylesheet
       * owns what is on top rather than this JSX ordering deciding it by accident.
       */}
      <figure className={styles.mediaFrame}>
        {Boolean(captionText) && (
          /*
           * The positioning class is on the `<figcaption>` and `Tag` is left bare, which keeps
           * `Tag`'s rule intact: a consuming class holds placement and nothing else. Everything the
           * chip looks like — fill, radius, padding, type — is `Tag`'s.
           *
           * `size="sm"` is the drawn 8×4 inset (node 16:258); `theme="light"` paints the off-white
           * fill with pine ink the design draws over both photographs; `weight="regular"` is the
           * JetBrains Mono Regular of node 16:259, against the mono role's Medium default. No
           * `uppercase`: the design's own caption carries a file name, and a file name has to be
           * reproduced verbatim.
           */
          <figcaption className={styles.caption}>
            <Tag label={captionText} size="sm" theme="light" variant="filled" weight="regular" />
          </figcaption>
        )}
        {/*
         * Spread, so `crop`, `hotspot` and the asset-level `altText` all reach `components/Image` —
         * the hotspot in particular, which is the only say an editor has over which slice of a tall
         * photograph survives a 2.3:1 frame.
         *
         * `aspectRatio="natural"` is **pinned rather than left to the spread**, and it is not
         * redundant. The shared `imageProjection` returns an `aspectRatio` key, which is `null` for
         * this section's `imageElementSimple` field and so falls through to `Image`'s `natural`
         * branch — the branch the frame needs, since the frame owns the ratio. But nothing enforced
         * that: swapping the field to `imageElementAdvanced`, or any document arriving with a value,
         * would pick `ratio_16-9` and set a `padding-bottom` spacer fighting the frame's
         * `aspect-ratio`. `SanityImageSimple` does not declare the key, so TypeScript could not warn
         * either. One word makes the invariant explicit at the call site.
         *
         * No `fill`: on the `natural` branch the wrapper is `width: 100%; height: 100%` and resolves
         * against the frame's definite height. `objectFit` is left at its `cover` default, which is
         * what an orientation photograph in a fixed frame wants.
         *
         * No `priority`. This image is a plausible LCP element on `/the-lodge`, but the section is
         * a page-builder block that can be placed anywhere on any page, and preloading it from
         * halfway down one is a straight regression. There is no "am I first" signal available to a
         * section here; if one is added, this is the call site that wants it.
         */}
        <Image {...image} aspectRatio="natural" sizes="(min-width: 1440px) 1360px, 100vw" />
        {pills.length > 0 && (
          /*
           * A list, because that is what three sibling place names are — and `role="list"` is not
           * redundant: the global reset sets `list-style-type: none` on every `ul`, and WebKit
           * strips the `list` role from an unstyled list that does not claim it back, so VoiceOver
           * would announce these as loose text. Same reasoning as `components/Footer`,
           * `HeaderDisplaySection` and `ScheduleSection`.
           *
           * Deliberately unnamed, and `role="list"` is name-*supported* rather than name-required,
           * so neither axe nor any WCAG criterion asks for one. The obvious label is "Locations",
           * but that is copy invented in code rather than authored, and `aria-labelledby` would need
           * a page-unique id this server component has no `useId` to make.
           *
           * What connects the pills to the photograph is therefore the **alt text**, not the
           * caption. An earlier version of this note said the caption did it, which rests on an
           * optional field — `WithoutCaption` is a supported, tested shape, and in that shape
           * nothing but co-location ties the three words to the image. The schema's alt-text rule
           * asks the editor to name the places the pills mark, which is the same fix from the other
           * end.
           *
           * ## The pills are hidden on a phone, and *how* is a deliberate choice
           *
           * The design drops them on mobile (node 16:403 draws the caption alone), and this renders
           * them at every width, clipped away below the switch in `styles.module.scss`. Three
           * options were on the table and two were rejected:
           *
           *   - **Not rendering them.** A section is a server component with no viewport, so
           *     gating on a breakpoint needs `'use client'` plus `matchMedia` — a hydration
           *     boundary, a frame of pills on first paint before the effect runs, and a section
           *     that can no longer be reviewed at two widths without reloading. A purely visual
           *     rule does not justify any of that.
           *   - **`display: none`.** It is CSS, but it takes the subtree out of the *accessibility
           *     tree* as well as the layout. So the real choice is not "in the DOM or not", it is
           *     whether somebody on a phone who cannot see the photograph also loses the names of
           *     the three places in it.
           *
           * These are editorial place names an editor typed into a CMS field, and the design drops
           * them because three chips would cover a third of a 350×200 frame — a constraint on the
           * *picture*, not on the information. So they are hidden the way you hide something for
           * space: out of the visual layout, still in the accessibility tree. Nothing here is
           * focusable (`Tag` renders a bare `<span>` with no handler, href, tabindex or role), so
           * the usual invisible-tab-stop trap does not apply.
           *
           * Worth raising at design review, per the ticket: the alternative the frame does not draw
           * is showing them *below* the image on a phone rather than over it.
           */
          <ul className={styles.tags} role="list">
            {pills.map(({ key, text }) => (
              <li key={key}>
                {/*
                 * `size="lg"` is the drawn 12×8 inset (nodes 16:261/263/265), `weight="bold"` the
                 * JetBrains Mono Bold they are set in, and `theme="dark"` the inversion that puts
                 * off-white type on a dark fill while the page stays light.
                 *
                 * No `className`: unlike the caption, a pill is placed by the flex row around it
                 * rather than by an inset of its own, so there is nothing for a consuming class to
                 * hold.
                 *
                 * No colour override, and not for want of a delta — the comp fills these with
                 * stone/900 (#131412) and `Tag`'s dark filled surface is `--bg-default`, i.e.
                 * pine/600. `Tag` owns that decision for every chip in the design and states it in
                 * its own stylesheet; re-pointing `--tag-fill` here would make this the one call
                 * site that disagrees. Raised in the ticket report instead.
                 */}
                <Tag label={text} size="lg" theme="dark" uppercase variant="filled" weight="bold" />
              </li>
            ))}
          </ul>
        )}
      </figure>
    </Section>
  );
};

export default MediaTagsSection;
