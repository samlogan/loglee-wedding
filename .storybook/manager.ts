import { addons } from 'storybook/manager-api';

/**
 * `?url` is load-bearing, for two reasons worth stating because neither is obvious.
 *
 * The manager is bundled by **esbuild**, not Vite — so `viteFinal` in `main.ts` (SVGR, the path
 * aliases, the SCSS injection) does not apply to this file at all. esbuild strips the `?url` query,
 * resolves the file, and applies its own `.svg` → `dataurl` loader, so `logoUrl` is a `data:` URI
 * string rather than a served path.
 *
 * And `types/svg.d.ts` declares `*.svg?url` as `string`, so this typechecks with no cast. A bare
 * `import logo from '../assets/logo/logo.svg'` would resolve identically at build time but be typed
 * as a React component, and `yarn ts:check` would fail.
 *
 * Note on recolouring: this project's `assets/logo/logo.svg` is authored with explicit near-black
 * fills (`#131412`), because that is how the wordmark reads on the site's off-white header. The
 * manager chrome is dark, so it is recoloured to white in `managerHead` in `./main.ts`
 * (`filter: brightness(0) invert(1)`, matched on `img[alt='<brandTitle>']`). A logo authored with
 * `fill="currentColor"` would need the same treatment for a different reason — inside an `<img>`
 * there is no inherited colour, so `currentColor` resolves to `canvastext`. Only a logo already
 * authored `fill="white"` would need no filter at all. The `max-width` rule alongside it is
 * unconditional, because Storybook's own `Img` sets `150px !important`.
 */
import logoUrl from '../assets/logo/logo.svg?url';
import projectTheme from './theme';

addons.setConfig({
  theme: {
    ...projectTheme,
    brandImage: logoUrl
  }
});
