import { TbClick } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/ClosingCtaSection/thumbnail.png';
import type { RsvpActionFields } from '../../../helpers/rsvpAction';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import type { IButtonElement } from '../elements/button';

/**
 * The home page's closing block: a short intro paragraph on one side, the actions on the other
 * (Figma nodes 1:71 desktop, 1:119 mobile).
 *
 * ## The RSVP action is not authored here
 *
 * Its label is `weddingSettings.rsvpLabel` and its destination `headerDocument.header.button.link` —
 * the same two fields the header pill reads — joined in by the projection
 * (`sections/ClosingCtaSection/queries.groq.ts`) and combined by the same helper the header uses
 * (`tools/helpers/rsvpAction`). The reply-by date appears three times on the home page, in the nav
 * pill, in the mobile menu and on this button, and it has to come from one place: a label or link
 * field here would be a second copy of the date, free to disagree with the first. What the section
 * does own is whether to show the action at all, which is `showRsvp`.
 *
 * The secondary button is ordinary authored content — "The Weekend" in the design.
 */
interface IClosingCtaSection {
  content?: SanityTextBlock[] | null;
  addButton?: boolean | null;
  button?: IButtonElement | null;
  showRsvp?: boolean | null;
  /**
   * Joined by the projection, present only while `showRsvp` is not switched off. Typed from the helper
   * that consumes it, so the fields the projection selects and the fields the helper reads cannot
   * drift apart.
   */
  rsvp?: RsvpActionFields | null;
}

const closingCtaSection = defineType({
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
     * `content`, per the field-naming rule in CLAUDE.md for a rich-text body; the Studio title says
     * "Intro" so an editor sees the role. `blockContentSimple`, not `Standard`: the design draws one
     * short paragraph (node 1:73), and the heading styles `Standard` adds would put an `<h1>` into a
     * page whose own heading is the hero's.
     */
    {
      description: 'The short paragraph on the left. Optional.',
      group: 'data',
      name: 'content',
      title: 'Intro',
      type: 'blockContentSimple'
    },
    /*
     * Above the RSVP switch because it renders first — the design reads "The Weekend", then the RSVP
     * button — so an editor meets the two controls in the order the page draws them.
     */
    {
      description:
        'A quieter outlined button beside the RSVP action — “The Weekend” in the design. Shown on desktop and tablet; phones show the RSVP action alone.',
      group: 'data',
      initialValue: false,
      name: 'addButton',
      title: 'Add Secondary Button',
      type: 'boolean'
    },
    {
      group: 'data',
      hidden: ({ parent }) => !parent?.addButton,
      name: 'button',
      title: 'Secondary Button',
      type: 'buttonElement'
    },
    /*
     * The only RSVP control on this section, and deliberately a switch rather than a label or a link:
     * see the note on the interface. `initialValue: true` because the action is the reason the block
     * exists; an unset value (an instance created before this field) reads as on, matching the
     * projection's `!= false`.
     */
    {
      description:
        'The RSVP button. Its label comes from Wedding Settings → RSVP Label and its destination from the Header’s RSVP Action — the same two fields the header pill reads, so a change to either updates both. Turn this off to hide it on this section only.',
      group: 'data',
      initialValue: true,
      name: 'showRsvp',
      title: 'Show RSVP Action',
      type: 'boolean'
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbClick,
  name: 'closingCtaSection',
  preview: {
    prepare(selection: { internalLabel?: string }) {
      return {
        subtitle: selection?.internalLabel,
        title: 'Closing CTA'
      };
    },
    select: {
      internalLabel: 'internalLabel'
    }
  },
  title: 'Closing CTA',
  type: 'object'
});

export { closingCtaSection };
export type { IClosingCtaSection };
