import { groq } from 'next-sanity';

// Section Projections
import closingCtaSectionProjection from '@/sections/ClosingCtaSection/queries.groq';
import embedSectionProjection from '@/sections/EmbedSection/queries.groq';
import faqSectionProjection from '@/sections/FaqSection/queries.groq';
import gridSectionProjection from '@/sections/GridSection/queries.groq';
import headerHeroSectionProjection from '@/sections/HeaderHeroSection/queries.groq';
import headerSimpleSectionProjection from '@/sections/HeaderSimpleSection/queries.groq';
import logosSectionProjection from '@/sections/LogosSection/queries.groq';
import mediaSectionProjection from '@/sections/MediaSection/queries.groq';
import threeColBlogSectionProjection from '@/sections/ThreeColumnBlogSection/queries.groq';
import threeColSectionProjection from '@/sections/ThreeColumnDefaultSection/queries.groq';
import twoColDefaultSectionProjection from '@/sections/TwoColumnDefaultSection/queries.groq';

const sectionsProjection = groq`{
  _key,
  _type,
  ${closingCtaSectionProjection}
  ${faqSectionProjection}
  ${gridSectionProjection}
  ${headerHeroSectionProjection}
  ${headerSimpleSectionProjection}
  ${mediaSectionProjection}
  ${logosSectionProjection}
  ${threeColSectionProjection}
  ${threeColBlogSectionProjection}
  ${embedSectionProjection}
  ${twoColDefaultSectionProjection}
  sectionFields {
    spacingOptions {
      removeTopSpacing,
      removeBottomSpacing
    }
  }
}`;

export default sectionsProjection;
