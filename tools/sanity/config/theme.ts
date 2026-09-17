import { buildLegacyTheme } from 'sanity';

const props = {
  '--custom-nav-bg': '#FFF',
  '--custom-primary': '#0B1C14'
};

const theme = buildLegacyTheme({
  /* Base theme colors */
  '--black': '#1a1a1a',
  '--white': '#fff',

  '--gray': '#666',
  '--gray-base': '#666',

  '--component-bg': '#fff',
  '--component-text-color': '#1a1a1a',

  /* Brand */
  '--brand-primary': props['--custom-primary'],

  // Default button
  '--default-button-color': '#666',
  '--default-button-primary-color': props['--custom-primary'],
  '--default-button-success-color': '#0f9d58',
  '--default-button-warning-color': '#f4b400',
  '--default-button-danger-color': '#db4437',

  /* State */
  '--state-info-color': '#4285f4',
  '--state-success-color': '#0f9d58',
  '--state-warning-color': '#f4b400',
  '--state-danger-color': '#db4437',

  /* Navbar */
  '--main-navigation-color': props['--custom-nav-bg'],
  '--main-navigation-color--inverted': '#1a1a1a',

  '--focus-color': '#000000'
});

export default theme;
