import { describe, expect, it } from 'vitest';

import type { ILinkElement } from '../sanity/schema/elements/link';
import { isCurrent, linkEmpty, normalisePath } from './link';

/**
 * `linkEmpty` decides whether a CTA renders at all. Getting it wrong either hides a working link or
 * renders a dead one, so each `linkType` branch is covered — an editor can pick a type and then not
 * fill the field it requires.
 */
// Deliberately partial: each case supplies only the field its branch reads, which is exactly the
// shape an editor produces when they pick a link type and leave its field blank. `Partial` alone is
// not enough — it loosens only the top level, while `internalLink` requires both `slug` and
// `pathname`.
const link = (value: Record<string, unknown>) => value as unknown as ILinkElement;

describe('linkEmpty', () => {
  it('treats a missing link or missing type as empty', () => {
    expect(linkEmpty(undefined as unknown as ILinkElement)).toBe(true);
    expect(linkEmpty(link({}))).toBe(true);
  });

  it('internal: needs a slug or a reference', () => {
    expect(linkEmpty(link({ linkType: 'internal' }))).toBe(true);
    expect(linkEmpty(link({ linkType: 'internal', internalLink: { slug: { current: '/about/' } } }))).toBe(false);
    expect(linkEmpty(link({ linkType: 'internal', internalLink: { _ref: 'abc123' } }))).toBe(false);
  });

  it('external: needs a URL', () => {
    expect(linkEmpty(link({ linkType: 'external' }))).toBe(true);
    expect(linkEmpty(link({ linkType: 'external', externalLink: 'https://example.com' }))).toBe(false);
  });

  it('phone, email and action each need their own field', () => {
    expect(linkEmpty(link({ linkType: 'phone' }))).toBe(true);
    expect(linkEmpty(link({ linkType: 'phone', phone: '0400000000' }))).toBe(false);
    expect(linkEmpty(link({ linkType: 'email' }))).toBe(true);
    expect(linkEmpty(link({ linkType: 'email', email: 'hi@example.com' }))).toBe(false);
    expect(linkEmpty(link({ linkType: 'action' }))).toBe(true);
    expect(linkEmpty(link({ linkType: 'action', action: 'openModal' }))).toBe(false);
  });
});

describe('isCurrent', () => {
  it('matches an internal link on pathname', () => {
    expect(isCurrent('/about/', link({ internalLink: { pathname: '/about/' } }))).toBe(true);
    expect(isCurrent('/contact/', link({ internalLink: { pathname: '/about/' } }))).toBe(false);
  });

  it('matches an external link on its URL', () => {
    expect(isCurrent('https://example.com', link({ externalLink: 'https://example.com' }))).toBe(true);
  });

  it('is false for a link with neither', () => {
    expect(isCurrent('/about/', link({}))).toBe(false);
  });
});

describe('normalisePath', () => {
  it('drops the trailing slash a stored pathname carries', () => {
    expect(normalisePath('/weekend/')).toBe('/weekend');
    expect(normalisePath('/the-lodge/')).toBe('/the-lodge');
  });

  it('spells the home page `/`, whichever way it was stored', () => {
    expect(normalisePath('/')).toBe('/');
    expect(normalisePath('/home/')).toBe('/');
  });

  it('is undefined for a blank value, so a caller can skip it', () => {
    expect(normalisePath('')).toBeUndefined();
    expect(normalisePath(null)).toBeUndefined();
    expect(normalisePath(undefined)).toBeUndefined();
  });
});
