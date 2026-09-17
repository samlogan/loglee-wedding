import { describe, expect, it } from 'vitest';

import hasBlockContent from './hasBlockContent';

const block = (...texts: string[]): SanityTextBlock => ({
  _key: 'k',
  _type: 'block',
  markDefs: [],
  style: 'normal',
  children: texts.map((text, index) => ({ _key: `c${index}`, _type: 'span', text }))
});

describe('hasBlockContent', () => {
  it('is false for the shapes a GROQ projection returns when the field is unset', () => {
    // An absent field projects as `null`, not `undefined`, so both have to be handled.
    expect(hasBlockContent(undefined)).toBe(false);
    expect(hasBlockContent(null)).toBe(false);
    expect(hasBlockContent([])).toBe(false);
  });

  it('is false for a block an editor emptied rather than deleted', () => {
    /*
     * The case this helper exists for. Sanity leaves the array holding one block with an empty
     * child, so `blocks.length` is 1 and every naive truthiness test reports content.
     */
    expect(hasBlockContent([block('')])).toBe(false);
    expect(hasBlockContent([block('   ')])).toBe(false);
    expect(hasBlockContent([block('', '  ')])).toBe(false);
    expect(hasBlockContent([block(''), block('')])).toBe(false);
  });

  it('is true as soon as any child carries text', () => {
    expect(hasBlockContent([block('Stay')])).toBe(true);
    // Only the second block has text — a leading empty paragraph must not mask it.
    expect(hasBlockContent([block(''), block('Stay')])).toBe(true);
    // Only the second child has text, which is what a bold run mid-sentence looks like.
    expect(hasBlockContent([block('', 'Stay')])).toBe(true);
  });

  it('treats a non-text member as content without inspecting it', () => {
    // An image or a divider renders something regardless of any text, so it counts.
    expect(hasBlockContent([{ _key: 'i', _type: 'blockContentImage' } as unknown as SanityTextBlock])).toBe(true);
    expect(hasBlockContent([{ _key: 'd', _type: 'divider' } as unknown as SanityTextBlock])).toBe(true);
  });

  it('survives a block with no children at all', () => {
    // `children` is required by the type but the API is not bound by the type.
    expect(hasBlockContent([{ _key: 'k', _type: 'block' } as unknown as SanityTextBlock])).toBe(false);
  });
});
