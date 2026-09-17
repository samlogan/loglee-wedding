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
import weddingSettings from './documents/weddingSettings';
import buttonElement from './elements/button';
// Common
import icon from './elements/icon';
import { imageElementAdvanced, imageElementSimple } from './elements/image';
import linkElement from './elements/link';
import slugElement from './elements/slug';
import title from './elements/title';
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
import { footer, linkGroup } from './objects/footer';
import { header, navLink, navSublink } from './objects/header';
import redirect from './objects/redirect';
import { sectionFields, spacingOptions, themeOptions } from './objects/sectionFields';
import seo from './objects/seo';
// Sections
import { faqSection } from './sections/faqSection';

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
  weddingSettings,

  // Objects
  blockContentSimple,
  blockContentStandard,
  blockContentAdvanced,
  blockContentImage,
  blockContentVideo,
  blockContentButtons,
  divider,
  footer,
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
  faqSection
];

export default schema;
