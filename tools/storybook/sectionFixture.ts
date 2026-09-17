import fixtures from './fixtures';

/** Keys every section fixture carries regardless of whether an editor filled anything in. */
const STRUCTURAL_KEYS = new Set(['_key', '_type', 'sectionFields', 'internalLabel', 'sectionPreview']);

/**
 * Does this fixture carry any actual content?
 *
 * A section that exists on a published page but was never filled in comes back as a **shaped object
 * with null leaves** — `{ _key, _type, title: null, content: null, featureCards: null, sectionFields }`.
 * That object is truthy, so a plain `sectionFixture(…) ?? mockArgs` never falls back and the story
 * renders an empty section shell. The story then documents nothing, and worse, looks broken.
 *
 * So "has a fixture" has to mean "has content", not "has an entry".
 */
const hasContent = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return Object.entries(value as Record<string, unknown>).some(([key, leaf]) => {
    if (STRUCTURAL_KEYS.has(key)) {
      return false;
    }
    if (leaf === null || leaf === undefined) {
      return false;
    }
    if (Array.isArray(leaf)) {
      return leaf.length > 0;
    }
    if (typeof leaf === 'string') {
      return leaf.trim().length > 0;
    }
    // A nested object counts when something inside it does — an image or button that is itself all
    // nulls is not content either.
    if (typeof leaf === 'object') {
      return hasContent(leaf);
    }
    /*
     * A bare boolean or number does **not** count.
     *
     * Toggle fields carry an `initialValue` in the schema, so `addButton: false` is present on a
     * section nobody has touched — it is the default, not an editorial choice, and treating it as
     * content marks an entirely blank section as populated. Only substantive fields (text, a
     * non-empty array, a populated object) mean somebody filled this in.
     */
    return false;
  });
};

/**
 * Look up a section's Sanity-sourced fixture by `_type`.
 *
 * Returns `undefined` when there is no fixture **or when the fixture has no content**, so a story can
 * fall back to design-faithful mock data:
 *
 *   const data = sectionFixture<ILogosSection>('logosSection') ?? mockArgs;
 *
 * Refresh fixtures with `yarn storybook:fixtures`.
 */
const sectionFixture = <T>(type: string): T | undefined => {
  const fixture = fixtures[type];
  return hasContent(fixture) ? (fixture as T) : undefined;
};

export default sectionFixture;
