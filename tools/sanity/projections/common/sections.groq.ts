import { groq } from 'next-sanity';

// Section Projections
import faqSectionProjection from '@/sections/FaqSection/queries.groq';

const sectionsProjection = groq`{
  _key,
  _type,
  ${faqSectionProjection}
  sectionFields {
    spacingOptions {
      removeTopSpacing,
      removeBottomSpacing
    }
  }
}`;

export default sectionsProjection;
