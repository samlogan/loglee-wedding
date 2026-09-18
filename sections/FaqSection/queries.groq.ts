import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
import buttonProjection from '@/tools/sanity/projections/common/button.groq';
import imageProjection from '@/tools/sanity/projections/common/image.groq';

/**
 * ## `button` used to be projected twice
 *
 * The key appeared at the top of this projection *and* again at the bottom. GROQ takes the last one
 * and the result is identical, so nothing rendered differently — which is exactly why it survived:
 * the only symptom was a second copy of `buttonProjection`'s ten lines in every page query that
 * holds an FAQ, which `yarn audit:projections` weighs. One copy now.
 *
 * ## The two conditionals are weight, not tidiness
 *
 * `addMap` and `addButton` are the toggles the Studio hides fields behind, and a Sanity `hidden`
 * predicate is a *display* rule and nothing more — an editor who fills in a map and then switches
 * `addMap` off leaves the whole object, image reference and all, in the document. Ungated, that map
 * (an asset dereference plus its metadata, by far the heaviest thing this section can hold) would go
 * on the wire for every request to a page whose FAQ does not draw one.
 *
 * Gating also makes the keys genuinely **absent** rather than null on the sections that do not want
 * them, which is what lets `tools/storybook/sectionFixture.ts` tell "nobody filled this in" from
 * "this section has no map".
 *
 * `title` needs no sub-projection — the `title` element is a plain string holding an HTML tag, which
 * `TextTitle` strips. `note` is a plain string and projects as-is.
 *
 * ## `_key` is not optional here
 *
 * Eight characters of query weight, and they buy correctness rather than tidiness.
 * `components/Accordion` holds the open item as a **numeric index** and each `AccordionItem` derives
 * its `aria-controls` target from `useId()`, so a list keyed by position reconciles wrongly the
 * moment an editor reorders or deletes an item — the wrong panel stays open and each item's measured
 * height is re-associated with the wrong content. Presentation renders drafts live, so that is a
 * thing an editor does while watching the page.
 */
const faqSectionProjection = groq`
  _type == 'faqSection' => {
    tagline,
    title,
    content[]${blockContentProjection},
    addMap,
    addMap == true => {
      map{
        image${imageProjection},
        embedUrl,
        badge,
        address,
        link${buttonProjection}
      }
    },
    faqItems[]{
      _key,
      question,
      answer[]${blockContentProjection},
      note
    },
    addButton,
    addButton == true => {
      buttonEyebrow,
      button${buttonProjection}
    }
  },
`;

export default faqSectionProjection;
