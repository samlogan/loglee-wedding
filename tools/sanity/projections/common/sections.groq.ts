import { groq } from 'next-sanity';

// Section Projections
import faqSectionProjection from '@/sections/FaqSection/queries.groq';
import headerDisplaySectionProjection from '@/sections/HeaderDisplaySection/queries.groq';
import scheduleSectionProjection from '@/sections/ScheduleSection/queries.groq';

/*
 * `sectionFields.themeOptions` was missing from this projection, and the omission was silent.
 *
 * Every section reads its theme through `getSectionTheme(props)`, which looks at
 * `sectionFields.themeOptions.theme` — a key this projection never returned. The Studio's Light/Dark
 * radio therefore changed nothing on a published page and every section fell through to its
 * component-level fallback. It does not show up in Storybook either, because `sectionStory.tsx`
 * injects the theme into args from the toolbar global, so a section looks correctly themeable there
 * while being fixed in production.
 *
 * Kept as a TypeScript comment rather than one inside the template literal: everything between the
 * backticks is sent to the Sanity API, so a comment there is query weight (`yarn audit:projections`
 * counts it) and depends on GROQ's comment syntax rather than on TypeScript's.
 */
const sectionsProjection = groq`{
  _key,
  _type,
  ${faqSectionProjection}
  ${headerDisplaySectionProjection}
  ${scheduleSectionProjection}
  sectionFields {
    spacingOptions {
      removeTopSpacing,
      removeBottomSpacing
    },
    themeOptions {
      theme
    }
  }
}`;

export default sectionsProjection;
