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
      description:
        'The page heading. Always rendered as the page’s <h1> and set in the display type scale — the level selector beside this field does not change that.',
      group: 'data',
      name: `title`,
      /*
       * `TitleInput` shows a live h1–span selector and defaults it to `h2`, but the component forces
       * `as="h1"` and discards the choice — so the control was presenting an option it does not have.
       * The input reads this option (`TitleInput/index.tsx`), so at minimum the selector now opens on
       * the tag that will actually be rendered. Making it genuinely read-only needs a `lockTag`
       * option on the input, which is a change to a shared Studio component rather than to this
       * section.
       */
      options: { defaultTag: 'h1' as const },
      title: `Title`,
      type: `title`,
      /*
       * `required()` alone is not enough. `TitleInput` unsets an emptied field, so the common blank
       * case is covered — but a single space is stored as `<h1> </h1>`, which `required()` sees as a
       * non-empty string and `TextTitle`'s `if (!title)` guard sees as truthy, so the page ships an
       * empty `<h1>`. Stripping the tags before testing is the same whitespace check `items` gets in
       * the component.
       */
      validation: (Rule) =>
        Rule.required().custom((value?: string) =>
          stripTitleTags(value ?? '').trim() ? true : 'Title cannot be blank'
        )
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
      /*
       * "Type them in sentence case" is not a style preference. `text-transform: uppercase` already
       * guarantees the display, so literal capitals in the stored value buy nothing and cost
       * pronunciation: short all-caps runs are the case screen readers most often spell out letter
       * by letter. The heading already works this way — the design draws "STAY", the CMS holds
       * "Stay" — and this makes the two fields agree.
       */
      description:
        'Short facts shown beside or beneath the heading — counts, dates, times. Type them in normal sentence case; they are displayed in uppercase mono automatically. They wrap onto as many lines as they need.',
      group: 'data',
      name: 'items',
      of: [{ type: 'string' }],
      options: { layout: 'tags' as const },
      title: 'Meta Items',
      type: 'array',
      /*
       * The component keys these by their own text, because an editor reorders them in place and an
       * index key would leave the old text in the old node. That is only safe if they really are
       * unique, and a tags input happily takes "TBC" twice — which would be a duplicate React key
       * and undefined reconciliation. This makes the component's premise true rather than assumed.
       */
      validation: (Rule) => Rule.unique()
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
