import { describe, expect, it } from 'vitest';

import stripTitleTags from './stripTitleTags';

/**
 * Sanity's rich-text title field stores a heading tag around the copy. `Text` needs the two apart:
 * the plain string to render, and the element to render it as. Getting the element wrong changes the
 * document outline, so the fallback matters as much as the happy path.
 */
describe('stripTitleTags', () => {
  it('splits the tag from the text', () => {
    expect(stripTitleTags('<h2>Award-winning leaders</h2>')).toEqual({
      as: 'h2',
      text: 'Award-winning leaders'
    });
  });

  it('carries whichever heading level the editor chose', () => {
    expect(stripTitleTags('<h1>Finance you can trust</h1>').as).toBe('h1');
    expect(stripTitleTags('<h4>Smaller heading</h4>').as).toBe('h4');
    expect(stripTitleTags('<span>Not a heading</span>').as).toBe('span');
  });

  it('strips every tag in the string, not just the first', () => {
    expect(stripTitleTags('<h2>Two</h2><span>parts</span>').text).toBe('Twoparts');
  });

  /**
   * `h2` is the default rather than `h1`: a page has one `h1` and it belongs to the page title, so a
   * section title defaulting to `h1` would produce a document with several.
   */
  it('falls back to h2 when there is no recognised tag', () => {
    expect(stripTitleTags('Bare text').as).toBe('h2');
    expect(stripTitleTags('<div>Wrong tag</div>').as).toBe('h2');
  });

  it('returns an empty h2 for no input', () => {
    expect(stripTitleTags()).toEqual({ as: 'h2', text: '' });
    expect(stripTitleTags('')).toEqual({ as: 'h2', text: '' });
  });
});
