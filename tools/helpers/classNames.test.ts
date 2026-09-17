import { describe, expect, it } from 'vitest';

import classNames from './classNames';

/**
 * Used by every component in the repo to compose SCSS-module classes, usually with a mix of
 * definitely-present strings and conditionally-present ones. The falsy handling is the whole point:
 * `styles[`variant_${variant}`]` is `undefined` whenever `variant` is unset.
 */
describe('classNames', () => {
  it('joins strings with a single space', () => {
    expect(classNames('button', 'primary')).toBe('button primary');
  });

  it('drops undefined and null, which is how optional modifiers arrive', () => {
    expect(classNames('button', undefined, null, 'large')).toBe('button large');
  });

  it('takes object keys whose values are truthy', () => {
    expect(classNames('card', { active: true, disabled: false })).toBe('card active');
  });

  it('accepts numbers, since a numeric modifier is still a valid class', () => {
    expect(classNames('col', 4)).toBe('col 4');
  });

  /**
   * Returns `undefined` rather than an empty string, so `className={classNames(...)}` omits the
   * attribute entirely instead of rendering `class=""`.
   */
  it('returns undefined when nothing survives', () => {
    expect(classNames()).toBeUndefined();
    expect(classNames(undefined, null, { off: false })).toBeUndefined();
  });
});
