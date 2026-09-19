import { TbDeviceGamepad } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/PlayerSelectSection/thumbnail.png';
import type { ModelClipNames } from '../../../helpers/modelClips';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

/**
 * One card's worth of a `player` document, as `sections/PlayerSelectSection/queries.groq.ts`
 * projects it — not the document itself.
 *
 * Declared here rather than picked from `IPlayerDocument`, because the two disagree about what can be
 * missing and this one has to be right. The document type states the *schema*: `name` and `slug` are
 * required there and `clips` is always an object. The projection states the *data*: a draft can hold
 * a player with no slug yet, GROQ returns `null` for any field that was never set, and `clips` comes
 * back `null` on a player nobody has opened the 3D tab for. The card has an answer for every one of
 * those, so the type has to be able to say them.
 *
 * `clips` carries `idle` and `hover` only — `feature` is the player page's rest clip and the
 * projection does not ask for it, so the type does not offer it either.
 */
interface IPlayerSelectSectionPlayer {
  _id: string;
  name?: string | null;
  /** `player.selectLabel` — the label beside the name. Blank falls back to the position. */
  selectLabel?: string | null;
  slug?: { current?: string | null } | null;
  model?: { asset?: { url?: string | null } | null } | null;
  clips?: Pick<ModelClipNames, 'idle' | 'hover'> | null;
  fallbackImage?: SanityImageSimple | null;
}

/**
 * The home page's character select — a framed panel, a corner caption, a centred prompt, and one card
 * per player (Figma nodes 1:79 desktop, 1:124 mobile).
 *
 * There is no `players` field: every `player` document is joined in by the projection, in its own
 * `order`. The label beside each name is the player's own Select Player Label, and the position
 * (`P1`, `P2`) when that is blank. See
 * `sections/PlayerSelectSection/queries.groq.ts` for why that is a join rather than a reference array.
 */
interface IPlayerSelectSection {
  caption?: string | null;
  prompt?: string | null;
  /** Joined by the projection. Never authored on the section. */
  players?: IPlayerSelectSectionPlayer[] | null;
}

const playerSelectSection = defineType({
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
     * Sentence case in the CMS, capitals from CSS — the convention `faqSection.tagline` and
     * `headerDisplaySection.items` both state. `text-transform` does not keep capitals out of the
     * accessibility tree (Chromium names an element from its rendered text), so a stored "SELECT
     * PLAYER" is what a screen reader spells out, letter by letter.
     *
     * The caption itself is decorative, and hidden from screen readers by the component: it describes
     * the canvases, which are hidden inside the cards' links. Its description says so, so nobody puts
     * information here that only sighted readers would get.
     */
    {
      description:
        'The small label in the panel’s top-left corner — “3D canvas (react three fiber) · idle loop”. Optional, and decorative: it is not read out by screen readers, so do not put anything here a guest needs to know. Type it in normal sentence case; it is displayed in uppercase mono automatically.',
      group: 'data',
      name: 'caption',
      title: 'Caption',
      type: 'string'
    },
    /*
     * Pre-filled, where the caption is not, because the prompt is the panel's heading: it is what
     * tells a screen-reader user what the two links after it are for, and what heading navigation lands
     * on. Optional by the ticket, so a warning rather than an error — an editor can still publish
     * without it, having been told what that costs.
     */
    {
      description:
        'The centred line above the cards — “Select player”. It is the panel’s heading for screen-reader users. The cards themselves are every Player document, in the order set by each player’s Order field: add, remove or reorder players there, not here.',
      group: 'data',
      initialValue: 'Select player',
      name: 'prompt',
      title: 'Prompt',
      type: 'string',
      validation: (Rule) =>
        Rule.required().warning(
          'Without a prompt the character select has no heading, so screen-reader users navigating by heading cannot find it.'
        )
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbDeviceGamepad,
  name: 'playerSelectSection',
  preview: {
    prepare(selection: { internalLabel?: string }) {
      return {
        subtitle: selection?.internalLabel,
        title: 'Player Select'
      };
    },
    select: {
      internalLabel: 'internalLabel'
    }
  },
  title: 'Player Select',
  type: 'object'
});

export { playerSelectSection };
export type { IPlayerSelectSection, IPlayerSelectSectionPlayer };
