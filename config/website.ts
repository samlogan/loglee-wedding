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
  title: 'Sam & Lauren', // Default Site Title used for SEO & PWA
  titleTemplate: '%s - Sam & Lauren', // Title Template
  description:
    'Everything you need for our wedding weekend at The Lodge Jamberoo, 12–14 February 2027 — the plan, your room, and your RSVP.', // Default Site Decription used for SEO
  siteName: 'Sam & Lauren', // Sitename for Facebook
  siteLanguage: 'en', // Language Tag on <html> element
  banner: '/open-graph.png', // Default OpenGraph image
  ogLanguage: 'en_AU', // Facebook Language
  icon: 'src/assets/images/icon.png', // Used for manifest favicon, splash screen, and icon generation
  shortName: 'Sam+Lauren', // shortname for manifest. MUST be shorter than 12 characters
  author: 'Sam & Lauren', // Author for schemaORGJSONLD
  themeColor: '#1E4632', // PWA Icon background & address bar colour if installed on desktop
  backgroundColor: '#1E4632', // PWA colour shown before styles and content loads, should match the background-color CSS property in the site's stylesheet
  twitter: '', // Twitter Username,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL
};

export default website;
