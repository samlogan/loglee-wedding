import { TbHearts } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/HeroSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import type { IWeddingSettingsDocument } from '../documents/weddingSettings';

/**
 * A type as a GROQ projection returns it: every field optional, and `null` rather than absent where
 * the document has nothing — which is what the component and its stories actually receive.
 */
type Projected<T> = { [K in keyof T]?: T[K] | null };

/**
 * The slice of the `weddingSettings` singleton the hero renders, in the shape its projection joins
 * it: the names, the two dates and three of the venue's fields. `mapUrl` is not projected — nothing
 * here links anywhere.
 *
 * Picked from `IWeddingSettingsDocument` rather than restated, so a field renamed on the singleton
 * breaks this type rather than silently projecting `null`.
 */
type IHeroWeddingSettings = Projected<Pick<IWeddingSettingsDocument, 'startDate' | 'endDate'>> & {
  coupleNames?: Projected<IWeddingSettingsDocument['coupleNames']> | null;
  venue?: Projected<Pick<IWeddingSettingsDocument['venue'], 'name' | 'address' | 'travelNote'>> | null;
};

/**
 * The home page's opening block: the couple's names stacked in oversized display type over a
 * date-and-venue meta row (nodes 1:63 desktop, 1:112 mobile).
 *
 * ## Nothing is authored here, on purpose
 *
 * Every word the section shows already lives on `weddingSettings` — the names, the dates, the venue
 * and its travel note — and the footer, the header's reply-by line and the thank-you page read the
 * same document. A title field here would be a second copy of the couple's names in a place where
 * the two could disagree, so the section has no content fields at all and the projection joins the
 * singleton in instead (see `sections/HeroSection/queries.groq.ts`), the way `twoColumnListSection`
 * joins the contribution copy.
 *
 * What an editor controls on the section is only what is genuinely per-placement: its theme and its
 * spacing, through `sectionFields`.
 */
interface IHeroSection {
  /**
   * Joined from the singleton by the projection; `null` when the singleton has not been created.
   * The component renders every blank state, including this one.
   */
  weddingSettings?: IHeroWeddingSettings | null;
}

const heroSection = defineType({
  fields: [
    internalLabelField,
    {
      /*
       * The one place an editor opening this section learns where its content comes from, so the
       * description carries it. Without a Data group (see `groups` below) this is the first field
       * they see.
       */
      description:
        'Everything this section shows — the couple’s names, the dates, the venue, its street and travel note — comes from Wedding Settings. Edit it there; this section only sets the theme and spacing.',
      name: 'sectionPreview',
      title: 'Section Preview',
      type: 'image',
      components: { input: ReadOnlyImageInput },
      // @ts-expect-error -- `imageUrl` is read by ReadOnlyImageInput, not by Sanity's image type
      imageUrl: thumbnail.src,
      readOnly: true,
      group: 'internal'
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  /*
   * The shared groups minus Data, which would be empty.
   *
   * Not cosmetic. `defaultSectionGroups` marks Data `default: true`, and Sanity's object input
   * selects the default group whether or not any field is in it — but it *hides* a group with no
   * visible members from the tab bar. So this section would open on an empty form with no tab
   * selected. With Data gone and no other default, the Studio opens on "All fields", where the
   * preview's description above is the first thing an editor reads.
   */
  groups: defaultSectionGroups.filter((group) => group.name !== 'data'),
  icon: TbHearts,
  name: 'heroSection',
  preview: {
    prepare(selection: { internalLabel?: string }) {
      return {
        // Says where the words come from, since nothing in the section list could show them.
        subtitle: selection?.internalLabel || 'Names, dates and venue from Wedding Settings',
        title: 'Hero'
      };
    },
    select: {
      internalLabel: 'internalLabel'
    }
  },
  title: 'Hero',
  type: 'object'
});

export { heroSection };
export type { IHeroSection, IHeroWeddingSettings };
