import { TbHearts } from 'react-icons/tb';
import { defineType } from 'sanity';
import type { ValidationContext } from 'sanity';

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
 * The home page's opening block: a display-type heading over a date-and-venue meta row (nodes 1:63
 * desktop, 1:112 mobile).
 *
 * ## One field authored here, the rest joined
 *
 * `title` is free text, so the heading can say more than the names — "Sam & Lauren are getting
 * married". Left blank, the heading falls back to the couple's names from `weddingSettings`, stacked
 * as the comp draws them. Everything else the section shows — the dates, the venue and its travel
 * note — still lives only on `weddingSettings`, which the footer, the header's reply-by line and the
 * thank-you page also read, and the projection joins it in (see
 * `sections/HeroSection/queries.groq.ts`).
 */
interface IHeroSection {
  /** The heading as typed. Blank or absent shows the couple's names instead. */
  title?: string | null;
  /**
   * Joined from the singleton by the projection; `null` when the singleton has not been created.
   * The component renders every blank state, including this one.
   */
  weddingSettings?: IHeroWeddingSettings | null;
}

/** The section types that render a page's `<h1>` — each forces it, whatever an editor picks. */
const PAGE_HEADING_SECTIONS = new Set(['heroSection', 'headerDisplaySection']);

/**
 * Warns when this hero cannot be the page's one `<h1>` at the top of its outline.
 *
 * The hero forces `<h1>` (the AC), and so does `headerDisplaySection`, and nothing about the
 * `sections` array stops an editor adding a second one or dragging the hero below an `<h2>` band.
 * Either publishes a page whose outline is wrong (WCAG 1.3.1) from a choice made in the section
 * list — the same class of mistake `weddingSettings` already guards against for its rich text. So it
 * is said here, at the point of the choice.
 *
 * On the hero rather than on `page.sections`, because this section is the one that makes the claim
 * and this ticket's to add; a page-level rule covering both heading sections is the fuller form.
 * A warning, not an error: an editor mid-rearrangement passes through both states on the way to a
 * correct page, and a blocking rule would stop them saving that draft.
 *
 * Exported for its unit test only — `export const`, not a name in the `export { … }` list below,
 * which is where `yarn sections:register` looks for sub-types it would have to warn about.
 */
export const pageHeadingPlacement = (_value: unknown, context: ValidationContext): true | string => {
  const sections = (context.document?.sections ?? []) as { _key?: string; _type?: string }[];
  const [, segment] = context.path ?? [];
  const key = typeof segment === 'object' && segment !== null && '_key' in segment ? segment._key : undefined;

  if (sections.filter((section) => PAGE_HEADING_SECTIONS.has(section?._type ?? '')).length > 1) {
    return 'This page has more than one section that renders its main heading (Hero, Header Display). Keep one: a page should have a single h1.';
  }

  if (key && sections[0]?._key !== key) {
    return 'The hero renders the page’s main heading, so it should be the first section on the page.';
  }

  return true;
};

const heroSection = defineType({
  fields: [
    {
      /*
       * First, above even the internal label, because it is the one place an editor opening this
       * section learns where its content comes from. Without a Data group (see `groups` below) the
       * Studio opens on "All fields", so this description is the first thing they read.
       */
      description:
        'The title is typed on this section; the dates, the venue, its street and travel note come from Wedding Settings. The title is the page’s main heading, so place the hero once, as the first section.',
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
      description:
        'The big heading, e.g. “Sam & Lauren are getting married”. Type it in normal case; it is displayed in capitals. Leave blank to show the couple’s names from Wedding Settings.',
      group: 'data',
      name: 'title',
      title: 'Title',
      type: 'string'
    },
    internalLabelField,
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
  groups: defaultSectionGroups,
  icon: TbHearts,
  name: 'heroSection',
  preview: {
    prepare(selection: { internalLabel?: string; title?: string }) {
      return {
        subtitle: selection?.internalLabel || 'Hero',
        title: selection?.title || 'Couple’s names from Wedding Settings'
      };
    },
    select: {
      internalLabel: 'internalLabel',
      title: 'title'
    }
  },
  title: 'Hero',
  type: 'object',
  validation: (Rule) => Rule.custom(pageHeadingPlacement).warning()
});

export { heroSection };
export type { IHeroSection, IHeroWeddingSettings };
