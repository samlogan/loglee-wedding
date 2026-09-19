import type { ValidationContext } from 'sanity';
import { describe, expect, it } from 'vitest';

import { pageHeadingPlacement } from './heroSection';

interface Section {
  _key: string;
  _type: string;
}

/** The context Sanity hands a `sections[]` member's validator: the page, and this member's keyed path. */
const on = (sections: Section[], key: string) =>
  ({
    document: { _id: 'page', _type: 'page', sections },
    path: ['sections', { _key: key }]
  }) as unknown as ValidationContext;

const hero: Section = { _key: 'hero', _type: 'heroSection' };
const header: Section = { _key: 'header', _type: 'headerDisplaySection' };
const band: Section = { _key: 'band', _type: 'twoColumnListSection' };

describe('pageHeadingPlacement', () => {
  it('passes a hero that opens the page and is its only heading section', () => {
    expect(pageHeadingPlacement(undefined, on([hero, band], 'hero'))).toBe(true);
    expect(pageHeadingPlacement(undefined, on([hero], 'hero'))).toBe(true);
  });

  it('warns when another section on the page also renders the h1', () => {
    // Both the other heading section and a second hero count — each forces an `h1`.
    expect(pageHeadingPlacement(undefined, on([hero, header], 'hero'))).toMatch(/more than one section/);
    expect(pageHeadingPlacement(undefined, on([hero, band, { _key: 'hero2', _type: 'heroSection' }], 'hero'))).toMatch(
      /more than one section/
    );
  });

  it('warns when the hero is not the first section', () => {
    expect(pageHeadingPlacement(undefined, on([band, hero], 'hero'))).toMatch(/first section/);
  });

  it('reports the duplicate before the position, since removing one may fix both', () => {
    expect(pageHeadingPlacement(undefined, on([header, hero], 'hero'))).toMatch(/more than one section/);
  });

  it('passes when there is no page to check against', () => {
    // A validation run outside a document — nothing to compare, so nothing to warn about.
    expect(pageHeadingPlacement(undefined, {} as ValidationContext)).toBe(true);
    expect(
      pageHeadingPlacement(undefined, { document: { _id: 'page', _type: 'page' } } as unknown as ValidationContext)
    ).toBe(true);
  });
});
