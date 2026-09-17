import type { SchemaTypeDefinition } from 'sanity';

// Blog Documents
import author from './documents/author';
import blogLandingPage from './documents/blogLandingPage';
import blogPost from './documents/blogPost';
import blogPostCategory from './documents/blogPostCategory';
import headerDocument from './documents/headerDocument';
// Documents
import page from './documents/page';
import { player, playerMeterStat, playerTextStat } from './documents/player';
import route from './documents/route';
import rsvp from './documents/rsvp';
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
import { header, navLink } from './objects/header';
import redirect from './objects/redirect';
import { sectionFields, spacingOptions, themeOptions } from './objects/sectionFields';
import seo from './objects/seo';
// Sections
import { faqSection } from './sections/faqSection';
import { headerDisplaySection } from './sections/headerDisplaySection';
import { scheduleSection } from './sections/scheduleSection';

const schema: SchemaTypeDefinition[] = [
  // Documents
  author,
  blogLandingPage,
  blogPost,
  blogPostCategory,
  headerDocument,
  page,
  player,
  route,
  rsvp,
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
  header,
  navLink,
  playerTextStat,
  playerMeterStat,
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
  faqSection,
  headerDisplaySection,
  scheduleSection
];

export default schema;
