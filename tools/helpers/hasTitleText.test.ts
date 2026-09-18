import { describe, expect, it } from 'vitest';

import hasTitleText from './hasTitleText';

describe('hasTitleText', () => {
  it('is false for the shapes a GROQ projection returns when the field is unset', () => {
    // An absent field projects as `null`, not `undefined`, so both have to be handled.
    expect(hasTitleText(undefined)).toBe(false);
    expect(hasTitleText(null)).toBe(false);
    expect(hasTitleText('')).toBe(false);
  });

  it('is false for the markup `TitleInput` leaves behind when an editor empties the field', () => {
    /*
     * The case this helper exists for. `Boolean(title?.trim())` is `true` for every one of these,
     * which is why the naive test passed for any field anyone had ever touched.
     */
    expect(hasTitleText('<h2></h2>')).toBe(false);
    expect(hasTitleText('<h1></h1>')).toBe(false);
    expect(hasTitleText('<h3></h3>')).toBe(false);
    expect(hasTitleText('<span></span>')).toBe(false);
  });

  it('is false for markup holding only whitespace', () => {
    // A single space is a real authoring state: an editor types, deletes, and leaves the space.
    expect(hasTitleText('<h2> </h2>')).toBe(false);
    expect(hasTitleText('<h2>   </h2>')).toBe(false);
  });

  it('is true as soon as the markup carries text', () => {
    expect(hasTitleText('<h2>FAQ</h2>')).toBe(true);
    expect(hasTitleText('<h3>King Room</h3>')).toBe(true);
    expect(hasTitleText('<span>Between events</span>')).toBe(true);
  });

  it('is true for a bare string with no markup at all', () => {
    // Mock data and older documents both reach the renderer without tags.
    expect(hasTitleText('Between events')).toBe(true);
    expect(hasTitleText('  Between events  ')).toBe(true);
  });
});
