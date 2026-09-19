/**
 * The map in the site's own colours — stone land, pine water and parks, ink labels — as a legacy JSON
 * style, which applies to a map **without** a map ID. (Google refuses a JSON style on a map that has
 * one; see `index.tsx`.)
 *
 * The colours are read from the design tokens at runtime rather than copied here, so a change to a
 * ramp in `_variables.scss` reaches the map too. The hex beside each is only the fallback for a
 * document where the token is missing, and is the token's value at the time of writing.
 */

const FALLBACK: Record<string, string> = {
  'pine-50': '#e3ede6',
  'pine-100': '#c7dbcd',
  'pine-200': '#a2c2ae',
  'pine-500': '#33654a',
  'pine-600': '#1e4632',
  'pine-700': '#173827',
  'pine-800': '#112a1e',
  'pine-900': '#0b1c14',
  'stone-25': '#f8f7f2',
  'stone-50': '#f3f1ea',
  'stone-100': '#edebe3',
  'stone-200': '#e8e5dc',
  'stone-300': '#dcd9cf',
  'stone-600': '#65635c',
  'stone-800': '#2a2a26',
  'stone-900': '#131412'
};

type Token = keyof typeof FALLBACK;

/** A ramp step's resolved colour — the primitives are declared on `:root`. */
export const readToken = (token: Token): string => {
  if (typeof document === 'undefined') {
    return FALLBACK[token];
  }

  return getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim() || FALLBACK[token];
};

const off = [{ visibility: 'off' }];

/**
 * What is hidden is as much the style as the colours: business pins, transit, road shields and
 * administrative borders are all noise on a map whose job is "the venue is here". Place names stay,
 * so a guest can see where the venue sits relative to the towns they know.
 */
export const mapStyle = (theme: ProjectTheme = 'light'): google.maps.MapTypeStyle[] => {
  const dark = theme === 'dark';
  const c = (light: Token, onDark: Token) => readToken(dark ? onDark : light);

  return [
    { elementType: 'geometry', stylers: [{ color: c('stone-100', 'pine-700') }] },
    { elementType: 'labels.icon', stylers: off },
    { elementType: 'labels.text.fill', stylers: [{ color: c('stone-600', 'pine-100') }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: c('stone-50', 'pine-800') }] },

    { featureType: 'administrative', elementType: 'geometry', stylers: off },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: c('stone-800', 'pine-50') }]
    },
    { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: c('stone-200', 'pine-600') }] },

    { featureType: 'poi', stylers: off },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ visibility: 'on' }, { color: c('pine-50', 'pine-600') }]
    },

    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: c('stone-25', 'pine-600') }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: off },
    { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: c('stone-300', 'pine-500') }] },

    { featureType: 'transit', stylers: off },

    { featureType: 'water', elementType: 'geometry', stylers: [{ color: c('pine-100', 'pine-900') }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: c('pine-500', 'pine-200') }] }
  ];
};

/**
 * The venue pin: a teardrop in the ink of the address bar, with a paper-coloured dot — inverted on
 * the dark theme. SVG, so it is sharp at any pixel density.
 */
export const pinSvg = (theme: ProjectTheme = 'light'): string => {
  const dark = theme === 'dark';
  const fill = readToken(dark ? 'stone-50' : 'stone-900');
  const dot = readToken(dark ? 'pine-600' : 'stone-50');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 43 16 43s15-16 15-27.2C31 7.6 24.3 1 16 1Z" fill="${fill}" stroke="${dot}" stroke-width="2"/><circle cx="16" cy="16" r="5.5" fill="${dot}"/></svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
