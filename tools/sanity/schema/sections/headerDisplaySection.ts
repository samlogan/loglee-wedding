import { TbLayoutNavbar } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/HeaderDisplaySection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import stripTitleTags from '../../helpers/stripTitleTags';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

/**
 * The shared page header — an oversized display heading with an optional lede and an optional block
 * of short uppercase meta items.
 *
 * Drawn three times in the design and identical in structure each time: Planner (node 1:307),
 * Stay (node 1:615) and The Lodge (node 16:121). The only thing that varies between them is which of
 * the two optional parts an editor filled in, which is why both are optional fields rather than
 * three sections.
 */
interface IHeaderDisplaySection {
  title?: string;
  content?: SanityTextBlock[];
  items?: string[];
}

const headerDisplaySection = defineType({
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
     * Required, unlike the two fields below it. `TextTitle` returns `null` for an empty title while
     * the aside renders regardless, so a blank one publishes a page whose only header is a lede and
     * a meta row — and a page with no `<h1>` at all. The field description already promises the
     * opposite.
     */
    {
      description: 'The page heading. Rendered as the page’s <h1> and set in the display type scale.',
      group: 'data',
      name: `title`,
      title: `Title`,
      type: `title`,
      validation: (Rule) => Rule.required()
    },
    /*
     * Named `content` rather than `lede` to match the field-naming rule in CLAUDE.md (`content` /
     * `body` for a rich-text body) and `faqSection`, which already uses it. The Studio title says
     * "Lede" so an editor sees the role rather than the convention.
     */
    {
      description: 'Optional short intro paragraph beside the heading.',
      group: 'data',
      name: `content`,
      title: `Lede`,
      type: 'blockContentSimple'
    },
    /*
     * Plain strings, not objects. Every item the design draws is a single short run of text —
     * "39 ROOMS", "MAP · LEVEL 01", "ALL TIMES AEDT · TBC" — with nothing to hang a second field on,
     * and an object of one field is a worse editing experience for no gain.
     */
    {
      description:
        'Short facts shown in uppercase mono beside or beneath the heading — counts, dates, times. They wrap onto as many lines as they need.',
      group: 'data',
      name: 'items',
      of: [{ type: 'string' }],
      options: { layout: 'tags' as const },
      title: 'Meta Items',
      type: 'array'
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbLayoutNavbar,
  name: 'headerDisplaySection',
  preview: {
    prepare(selection: { internalLabel?: string; title?: string }) {
      return {
        subtitle: selection?.internalLabel,
        title: stripTitleTags(selection?.title) || `Header Display`
      };
    },
    select: {
      internalLabel: 'internalLabel',
      title: 'title'
    }
  },
  title: 'Header Display',
  type: 'object'
});

export { headerDisplaySection };
export type { IHeaderDisplaySection };
