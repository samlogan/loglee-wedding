import globals from './fixtures/globals.json';

/**
 * Look up a site-wide singleton pulled from Sanity by `yarn storybook:fixtures`.
 *
 * The companion to `sectionFixture`. Sections are per-page and covered by `sectionsProjection`;
 * these are the global documents — header, socials, wedding settings — that components read
 * directly. (There is no `footer` key: `footerDocument` was deleted with MAM-1888, and
 * `components/Footer` now reads the header's own nav items plus the wedding singleton.)
 *
 * It exists because the components that read them are async server components. Storybook cannot
 * render those, so `.storybook/main.ts` swaps them for `index.mock.tsx` siblings, and those mocks
 * would otherwise hardcode their content. That is invisible drift by construction: the mock keeps
 * rendering whatever was typed the day it was written, and nothing ever says it has diverged from
 * the published document.
 *
 * Anything standing in for a fetching component should read `globalFixture`, with a shaped constant
 * only as a fallback. Where a value is computed rather than stored (an "as at" date that is always
 * today), the mock should compute it too, not freeze it.
 *
 *   const header = globalFixture<IHeaderDocument>('header') ?? FALLBACK_HEADER;
 *
 * ## The limit of "missing"
 *
 * Returns `undefined` only when the key is absent or null. A GROQ projection returns a *shaped
 * object with null leaves* when the parent document exists but its fields are blank, and that object
 * is not nullish — so the `??` above will not fire for it. A cleared field reaches the mock as
 * `{ label: null, value: null }` and renders blank rather than falling back. If a mock needs to
 * treat blank-but-shaped as missing, it has to check the field it actually uses.
 */
const globalFixture = <T>(name: keyof typeof globals): T | undefined => {
  const value = (globals as Record<string, unknown>)[name];
  return value === null || value === undefined ? undefined : (value as T);
};

export default globalFixture;
