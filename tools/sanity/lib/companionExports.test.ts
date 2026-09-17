/*
 * Covers the one piece of the section generator that is not proved by running it.
 *
 * The generator's outputs are asserted by `schema/registration.test.ts`, in both directions. Its
 * sub-type warning is not: it is a regex over source text whose failure mode is silence, and a
 * silent miss here reintroduces exactly the "registered in three of four places" bug the generator
 * exists to remove. Cases are derived from the documented intent above `companionExports`.
 */

import { describe, expect, it } from 'vitest';

import { companionExports } from './companionExports';

describe('companionExports', () => {
  it('returns nothing when a schema exports only its own section', () => {
    expect(companionExports('export { faqSection };\n', 'faqSection')).toEqual([]);
  });

  it('names a sub-type exported alongside the section', () => {
    expect(companionExports('export { faqSection, faqCard };\n', 'faqSection')).toEqual(['faqCard']);
  });

  it('takes the alias, because that is the name the schema index would import', () => {
    expect(companionExports('export { faqSection, card as faqCard };\n', 'faqSection')).toEqual(['faqCard']);
  });

  it('ignores type-only exports, which register nothing', () => {
    expect(companionExports('export { faqSection };\nexport type { IFaqSection };\n', 'faqSection')).toEqual([]);
  });

  it('reads every export statement, not just the first', () => {
    expect(companionExports('export { faqSection };\nexport { faqCard };\n', 'faqSection')).toEqual(['faqCard']);
  });
});
