import { describe, expect, it } from 'vitest';

import { getSectionSpacingProps, getSectionTheme } from './section';

describe('getSectionTheme', () => {
  it('returns the editor-selected theme', () => {
    expect(getSectionTheme({ sectionFields: { themeOptions: { theme: 'dark' } } })).toBe('dark');
  });

  it('falls back when no theme is selected', () => {
    expect(getSectionTheme({ sectionFields: { themeOptions: {} } }, 'light')).toBe('light');
    expect(getSectionTheme({ sectionFields: {} }, 'light')).toBe('light');
    expect(getSectionTheme({}, 'light')).toBe('light');
  });

  it('prefers the selection over the fallback', () => {
    // This is what makes the Storybook theme toolbar work: `sectionStory.tsx` injects the toolbar
    // theme as the selection, and a section's own fallback must not override it.
    expect(getSectionTheme({ sectionFields: { themeOptions: { theme: 'dark' } } }, 'light')).toBe('dark');
  });

  it('returns undefined when there is neither a selection nor a fallback', () => {
    // `Section` then applies its own default, so undefined has to pass through rather than becoming
    // a string.
    expect(getSectionTheme({})).toBeUndefined();
  });

  it('survives a null sectionFields', () => {
    // GROQ projects an absent object as null, not undefined, so this is the shape that actually
    // arrives rather than a hypothetical one.
    expect(getSectionTheme({ sectionFields: null as never }, 'light')).toBe('light');
  });
});

describe('getSectionSpacingProps', () => {
  it('returns nothing when the section has no spacing options', () => {
    // An empty object, not `{ spacing: 'lg' }` — the caller spreads the result, so returning a
    // default here would override a `spacing` prop written after the spread.
    expect(getSectionSpacingProps({})).toEqual({});
    expect(getSectionSpacingProps({ sectionFields: {} })).toEqual({});
  });

  it('passes the editor toggles through, with the default spacing step', () => {
    expect(
      getSectionSpacingProps({
        sectionFields: { spacingOptions: { removeTopSpacing: true, removeBottomSpacing: false } }
      })
    ).toEqual({ removeTopSpacing: true, removeBottomSpacing: false, spacing: 'lg' });
  });

  it('always reports the `lg` step once spacing options exist', () => {
    /*
     * Asserted because it is a trap rather than because it is obviously right: the step is hardcoded,
     * so an editor cannot choose a spacing size — only whether each edge is removed. A section
     * wanting a different step has to pass `spacing` itself, **after** the spread, or this value
     * wins. `yarn audit:layout` reports any section that gets that order wrong.
     */
    expect(getSectionSpacingProps({ sectionFields: { spacingOptions: {} } })).toMatchObject({ spacing: 'lg' });
  });
});
