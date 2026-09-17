interface WebsiteConfig {
  pathPrefix: string;
  title: string;
  titleTemplate: string;
  description: string;
  siteName: string;
  siteLanguage: string;
  banner: string;
  ogLanguage: string;
  icon: string;
  shortName: string;
  author: string;
  themeColor: string;
  backgroundColor: string;
  twitter: string;
  siteUrl: string | undefined;
}

const website: WebsiteConfig = {
  pathPrefix: '/', // Prefix for all links. If you deploy your site to example.com/portfolio your pathPrefix should be "portfolio"
  title: 'PLACEHOLDER_SITE_TITLE', // Default Site Title used for SEO & PWA
  titleTemplate: '%s - PLACEHOLDER_SHORT_NAME', // Title Template
  description: 'PLACEHOLDER_SITE_DESCRIPTION', // Default Site Decription used for SEO
  siteName: 'PLACEHOLDER_SITE_NAME', // Sitename for Facebook
  siteLanguage: 'en', // Language Tag on <html> element
  banner: '/open-graph.png', // Default OpenGraph image
  ogLanguage: 'en_AU', // Facebook Language
  icon: 'src/assets/images/icon.png', // Used for manifest favicon, splash screen, and icon generation
  shortName: 'PLACEHOLDER', // shortname for manifest. MUST be shorter than 12 characters
  author: 'PLACEHOLDER_AUTHOR', // Author for schemaORGJSONLD
  themeColor: '#000000', // PWA Icon background & address bar colour if installed on desktop
  backgroundColor: '#000000', // PWA colour shown before styles and content loads, should match the background-color CSS property in the site's stylesheet
  twitter: '', // Twitter Username,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL
};

export default website;
