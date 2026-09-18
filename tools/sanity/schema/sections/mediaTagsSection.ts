import { TbMapPin } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/MediaTagsSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

/**
 * One wide photograph with a caption chip in its top corner and a row of place-name pills in its
 * bottom one — the aerial site-orientation image on `/the-lodge` (nodes 16:257 desktop, 16:403
 * mobile).
 *
 * ## Why the pills are a field and not part of the picture
 *
 * They name places on the property, which is copy an editor maintains: a location gets added, a
 * marquee gets renamed, the pool closes. Baking them into the image would put that behind a
 * re-export by whoever owns the source file, and would put place names into a raster where no
 * screen reader, no search index and no translation can reach them. An unbounded `tags` array costs
 * nothing and makes all three work.
 *
 * ## Both overlays are optional, and independently
 *
 * A second instance of this section may be a plain captioned photograph, or a labelled map with no
 * caption. The component renders the frame from `image` alone and each overlay only when it has
 * content, so neither optional field leaves an empty box behind.
 *
 * ## The extension point, named rather than built
 *
 * Both chips pin a `Tag` theme — light for the caption, dark for the pills — which is what `Tag`
 * asks a chip *over media* to do, since inheriting the page's theme says nothing about the
 * photograph underneath. One instance is not a case for a field, so there is no control for it.
 * If a second instance ever needs the opposite treatment, the extension is a `styles`-group
 * `chipTheme` field feeding both `Tag`s' `theme` prop — **not** a colour override in the section's
 * stylesheet, which `components/Tag` explicitly closes.
 */
interface IMediaTagsSection {
  image?: SanityImageSimple;
  caption?: string;
  tags?: string[];
}

const mediaTagsSection = defineType({
  fields: [
    internalLabelField,
    {
      name: 'sectionPreview',
      title: 'Section Preview',
      type: 'image',
      components: { input: ReadOnlyImageInput },
      // @ts-expect-error -- `imageUrl` is read by ReadOnlyImageInput, not by Sanity's image type
      imageUrl: thumbnail.src,
      readOnly: true,
      group: 'internal'
    },
    /*
     * `imageElementSimple` rather than `imageElementAdvanced`, and the difference is one control.
     *
     * The advanced element adds an **Aspect Ratio** radio (natural / 1:1 / 4:3 / 16:9 / 21:9), and
     * this section cannot honour it: the frame is drawn at 1200×520 on desktop and 350×200 on
     * mobile, so the ratio is a responsive property of the *layout* and belongs in the stylesheet,
     * not in a field. Shipping the radio would put a control in the Studio that silently does
     * nothing — the failure mode `sections.groq.ts` had with `themeOptions` and nobody noticed.
     *
     * Hotspot and crop are on either way (both elements set `options.hotspot`), which is the control
     * that actually matters here: the frame is much wider than it is tall, so `object-fit: cover`
     * takes a slice, and the editor needs to say which slice.
     */
    /*
     * `required()` on the asset **and** a custom rule on the alt text, which is the first `altText`
     * validation in this repo and is here rather than in the shared element for a reason.
     *
     * The photograph *is* this section — there is no adjacent prose, and the caption does not stand
     * in for it (in Chromium a `<figcaption>` is a sibling text node, not the image's accessible
     * name). Measured: with `alt=""` Chromium emits **no image node at all**, so a published
     * instance with the field cleared gives a screen-reader user a filename and three place names
     * and nothing else. `components/Image` resolves `altText || asset.altText || ''`, so nothing
     * downstream catches it.
     *
     * The second clause is the one that makes the first work. `imageElementSimple` pre-fills
     * `altText` with `NEXT_PUBLIC_SANITY_PROJECT_NAME` (`../elements/image.ts`), so every new image
     * arrives non-empty and a plain emptiness check passes while announcing the site's name as a
     * description of an aerial photograph — worse than blank, because blank at least reads as
     * decorative and is skipped. Rejecting the default here keeps the fix inside this section.
     *
     * That pre-fill is a platform-wide 1.1.1 problem affecting every image field on the site and
     * wants its own ticket — changing the shared element from here would alter every other section's
     * authoring behaviour on a branch about one block.
     */
    {
      description:
        'The photograph. The frame is wide — roughly 2.3:1 on desktop and 1.75:1 on a phone — and the image is cropped to fill it, so set the hotspot on whatever must stay in shot.',
      group: 'data',
      name: 'image',
      title: 'Image',
      type: 'imageElementSimple',
      validation: (Rule) =>
        Rule.required().custom((value?: { altText?: string }) => {
          const altText = value?.altText?.trim();

          if (!altText) {
            return 'Add alt text. This photograph is the whole section — with the field blank it publishes as decorative and a screen reader skips it entirely. Describe what is in shot, and name the places the pills mark.';
          }

          if (altText === process.env.NEXT_PUBLIC_SANITY_PROJECT_NAME) {
            return 'Replace the pre-filled alt text with a description of this photograph — the site name tells a screen-reader user nothing about what is in shot.';
          }

          return true;
        })
    },
    /*
     * Sentence case in the CMS and no `uppercase` at the call site, unlike `tags` below.
     *
     * The design's own value is "IMAGE · lodge-aerial.jpg · pines + river + pool" — mixed case with a
     * file name in it — and a file name has to be reproduced verbatim. That is the same reason
     * `components/Tag` defaults `uppercase` to off.
     */
    {
      description:
        'A short line shown as a small chip in the top-left corner of the image — a credit, a place, or a note about what you are looking at. Write it for someone hearing it read aloud: no file names (a screen reader spells them out character by character), and do not begin with the word “Image” — it already announces one. Do not repeat the alt text. Optional.',
      group: 'data',
      name: 'caption',
      title: 'Caption',
      type: 'string',
      validation: (Rule) =>
        Rule.max(80).warning('A caption this long runs most of the way across the image on a phone.')
    },
    /*
     * An array of plain strings, matching `twoColumnListSection.items`. Nothing outside this section
     * references a pill, and an inline object would buy an editor a collapsible row per place name
     * for no gain.
     *
     * **Unbounded**, per the ticket, and the component wraps the row rather than clipping it — so a
     * ninth pill costs a second line rather than disappearing off the edge.
     *
     * `Rule.unique()` because two identical pills say nothing twice and the component has to
     * disambiguate their React keys when it happens. Publish-time only, as
     * `twoColumnListSection.items` notes at length — a draft mid-edit really can hold two, which is
     * why the component does not rely on this.
     *
     * `max(9)` as a **warning**, which is the caption's idiom applied to the more expensive of the
     * two fields. The row wraps rather than clipping, and extra lines grow *upward into the
     * photograph* — the right layout behaviour, and one an editor gets no signal about until the
     * page is published and half the picture is covered. Nine is the count the design's own facility
     * grid uses on this page and the realistic upper end. Advisory rather than blocking, because
     * "unbounded" is the ticket's requirement and a tenth pill is ugly rather than broken.
     */
    {
      description:
        'The places marked on the image, shown as a row of pills along the bottom-left. Type them in normal sentence case; they are displayed in uppercase automatically. Hidden on phones, where the image is too small to carry them — the words stay available to screen readers. Optional.',
      group: 'data',
      name: 'tags',
      of: [{ type: 'string' }],
      title: 'Location Pills',
      type: 'array',
      validation: (Rule) =>
        Rule.unique().max(9).warning('Past about nine pills the rows stack up into the photograph and cover it.')
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbMapPin,
  name: 'mediaTagsSection',
  preview: {
    /*
     * Unannotated, matching `player` — the other preview in this repo that carries
     * a `media` thumbnail. Sanity infers `Record<keyof select, any>` here, and a hand-written
     * annotation has to type `media` as whatever `PreviewValue` accepts (an image object *or* a
     * React element) rather than as `unknown`, which does not assign.
     */
    prepare(selection) {
      const { caption, internalLabel, media, tags } = selection;
      const count = (tags as string[] | undefined)?.length ?? 0;
      return {
        media,
        // The editor's own label wins; failing that, whatever identifies this instance — the caption
        // reads as a filename in the design, and the pill count distinguishes two captionless ones.
        subtitle:
          internalLabel || [caption, count && `${count} pill${count === 1 ? '' : 's'}`].filter(Boolean).join(' · '),
        title: 'Media Tags'
      };
    },
    select: {
      caption: 'caption',
      internalLabel: 'internalLabel',
      media: 'image',
      tags: 'tags'
    }
  },
  title: 'Media Tags',
  type: 'object'
});

export { mediaTagsSection };
export type { IMediaTagsSection };
