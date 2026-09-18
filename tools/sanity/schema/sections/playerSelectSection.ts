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
 * `clips` carries `idle` and `hover` only. `feature` is the player page's rest clip and the
 * projection does not ask for it.
 */
interface IPlayerSelectSectionPlayer {
  _id: string;
  name?: string | null;
  slug?: { current?: string | null } | null;
  model?: { asset?: { url?: string | null } | null } | null;
  clips?: ModelClipNames | null;
  fallbackImage?: SanityImageSimple | null;
}

/**
 * The home page's character select — a framed panel, a corner caption, a centred prompt, and one card
 * per player (Figma nodes 1:79 desktop, 1:124 mobile).
 *
 * ## The players are queried, not referenced
 *
 * There is no `players` field on this section. The projection joins **every** `player` document,
 * ordered by its `order` field — which already exists for exactly this ("Position on the Select
 * Player screen, lowest first") and has a matching Studio ordering. A reference array here would be a
 * second ordering to keep in step with the first, and the two would disagree the first time an editor
 * reordered one of them.
 *
 * The same reasoning covers `P1` / `P2`: they are the card's position in that ordering, so there is no
 * field for them either.
 */
interface IPlayerSelectSection {
  caption?: string | null;
  prompt?: string | null;
  /** Joined by the projection — see the note above. Never authored on the section. */
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
     */
    {
      description:
        'The small label in the panel’s top-left corner — “3D canvas (react three fiber) · idle loop”. Optional. Type it in normal sentence case; it is displayed in uppercase mono automatically.',
      group: 'data',
      name: 'caption',
      title: 'Caption',
      type: 'string'
    },
    /*
     * Pre-filled, where the caption is not, because the prompt is the panel's heading: it is what
     * tells a screen-reader user what the two links after it are for. An editor can still clear it.
     */
    {
      description:
        'The centred line above the cards — “Select player”. Optional. The cards themselves are every Player document, in the order set by each player’s Order field: add, remove or reorder players there, not here.',
      group: 'data',
      initialValue: 'Select player',
      name: 'prompt',
      title: 'Prompt',
      type: 'string'
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
