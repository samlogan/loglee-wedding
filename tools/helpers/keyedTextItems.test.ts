import { describe, expect, it } from 'vitest';

import keyedTextItems from './keyedTextItems';

const keysOf = (items: { key: string }[]) => items.map((item) => item.key);
const textsOf = (items: { text: string }[]) => items.map((item) => item.text);

describe('keyedTextItems', () => {
  it('is empty for the shapes a GROQ projection returns when the field is unset', () => {
    // An absent array field projects as `null`, not `undefined`, so both have to be handled.
    expect(keyedTextItems(undefined)).toEqual([]);
    expect(keyedTextItems(null)).toEqual([]);
    expect(keyedTextItems([])).toEqual([]);
  });

  it('trims and keeps the editor’s order', () => {
    const items = keyedTextItems(['  The lawn ', 'Fin’s Bar']);

    expect(textsOf(items)).toEqual(['The lawn', 'Fin’s Bar']);
  });

  it('drops rows an editor added and left blank', () => {
    /*
     * The case the helper exists for on the rendering side: a blank pill is an opaque box with no
     * label in it, and a blank hours item is a footer slot with a hairline over nothing.
     */
    expect(textsOf(keyedTextItems(['The lawn', '', '   ', 'Pool']))).toEqual(['The lawn', 'Pool']);
    expect(keyedTextItems(['', '  '])).toEqual([]);
    expect(keyedTextItems([null, undefined, 'Pool'])).toEqual([{ key: 'Pool#0', text: 'Pool' }]);
  });

  it('gives duplicates distinct keys, which `Rule.unique()` cannot promise in a draft', () => {
    // `Rule.unique()` is publish-time; Presentation renders drafts, so two identical lines are
    // reachable in exactly the environment an editor is watching.
    expect(keysOf(keyedTextItems(['Pool', 'Pool', 'Pool']))).toEqual(['Pool#0', 'Pool#1', 'Pool#2']);
  });

  it('cannot collide with a value that already looks like a suffixed key', () => {
    /*
     * The regression the unconditional suffix exists for. The `occurrence === 0 ? text : …` form two
     * of the three original call sites shipped yields `a`, `a#1`, `a#1` here — the second 'a' takes
     * the suffixed form and the literal 'a#1' takes its own text, and the two are the same string.
     */
    const keys = keysOf(keyedTextItems(['a', 'a', 'a#1']));

    expect(keys).toEqual(['a#0', 'a#1', 'a#1#0']);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps every key unique across any duplicate arrangement', () => {
    const keys = keysOf(keyedTextItems(['x', 'x#0', 'x', 'x#0', 'x#0#0']));

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('treats two rows that differ only in whitespace as duplicates', () => {
    // They render identically, so they must not share a key.
    const keys = keysOf(keyedTextItems([' Pool', 'Pool ']));

    expect(keys).toEqual(['Pool#0', 'Pool#1']);
  });
});
