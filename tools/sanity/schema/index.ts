import type { SchemaTypeDefinition } from 'sanity';

// Blog Documents
import author from './documents/author';
import blogLandingPage from './documents/blogLandingPage';
import blogPost from './documents/blogPost';
import blogPostCategory from './documents/blogPostCategory';
import footerDocument from './documents/footerDocument';
import headerDocument from './documents/headerDocument';
// Documents
import page from './documents/page';
import route from './documents/route';
import settings from './documents/settings';
import { socialMediaDocument, socialMediaItem } from './documents/socialMediaDocument';
import buttonElement from './elements/button';
// Common
import icon from './elements/icon';
import { imageElementAdvanced, imageElementSimple } from './elements/image';
import linkElement from './elements/link';
import slugElement from './elements/slug';
import title from './elements/title';
// Global Components
import globalLogos from './globalComponents/globalLogos';
// Objects
import {
  blockContentSimple,
  blockContentStandard,
  blockContentAdvanced,
  blockContentImage,
  blockContentVideo,
  blockContentButtons
} from './objects/blockContent';
import divider from './objects/divider';
import featureCard from './objects/featureCard';
import { footer, linkGroup } from './objects/footer';
import { header, navLink, navSublink } from './objects/header';
import redirect from './objects/redirect';
import { sectionFields, spacingOptions, themeOptions } from './objects/sectionFields';
import seo from './objects/seo';
import closingCtaSection from './sections/closingCtaSection';
// Sections
import embedSection from './sections/embedSection';
import { faqSection } from './sections/faqSection';
import { gridSection, gridCard } from './sections/gridSection';
import headerHeroSection from './sections/headerHeroSection';
import headerSimpleSection from './sections/headerSimpleSection';
import logosSection from './sections/logosSection';
import mediaSection from './sections/mediaSection';
import threeColBlogSection from './sections/threeColBlogSection';
import threeColSection from './sections/threeColSection';
import { twoColDefaultSection, alignMedia } from './sections/twoColDefaultSection';

const schema: SchemaTypeDefinition[] = [
  // Documents
  author,
  blogLandingPage,
  blogPost,
  blogPostCategory,
  footerDocument,
  headerDocument,
  page,
  route,
  settings,
  socialMediaDocument,

  // Global Components
  globalLogos,

  // Objects
  alignMedia,
  blockContentSimple,
  blockContentStandard,
  blockContentAdvanced,
  blockContentImage,
  blockContentVideo,
  blockContentButtons,
  divider,
  featureCard,
  footer,
  gridCard,
  linkGroup,
  header,
  navLink,
  navSublink,
  redirect,
  seo,
  sectionFields,
  socialMediaItem,
  spacingOptions,
  themeOptions,

  // Elements
  icon,
  title,
  imageElementSimple,
  imageElementAdvanced,
  linkElement,
  buttonElement,
  slugElement,

  // Sections
  embedSection,
  faqSection,
  gridSection,
  logosSection,
  mediaSection,
  closingCtaSection,
  twoColDefaultSection,
  headerHeroSection,
  headerSimpleSection,
  threeColSection,
  threeColBlogSection
];

export default schema;
