import { describe, expect, it } from 'vitest';

import { ALLOWED_IMAGE_HOSTS, isAllowedImageUrl, isValidDocumentRef, isValidFieldPath } from './imageSourceUrl';

/*
 * These assert the contract — "only these two hosts, only https" — rather than the current
 * implementation. A rewrite using a different matching strategy should still pass every case here,
 * and the lookalike cases below are the ones that separate a real check from a plausible-looking one.
 */
describe('isAllowedImageUrl', () => {
  it('allows the hosts the caller actually produces', () => {
    expect(isAllowedImageUrl('https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')).toBe(true);
    expect(isAllowedImageUrl('https://i.vimeocdn.com/video/1234567_1600x.jpg')).toBe(true);
  });

  it('blocks the cloud metadata endpoint', () => {
    // The payload this guard exists for: readable from most cloud hosts, returns credentials, and
    // the route would have uploaded the response to a public CDN.
    expect(isAllowedImageUrl('http://169.254.169.254/latest/meta-data/iam/security-credentials/')).toBe(false);
    expect(isAllowedImageUrl('https://169.254.169.254/latest/meta-data/')).toBe(false);
  });

  it('blocks loopback and private ranges', () => {
    expect(isAllowedImageUrl('http://localhost:3000/api/internal')).toBe(false);
    expect(isAllowedImageUrl('https://127.0.0.1/')).toBe(false);
    expect(isAllowedImageUrl('https://[::1]/')).toBe(false);
    expect(isAllowedImageUrl('https://10.0.0.5/')).toBe(false);
    expect(isAllowedImageUrl('https://192.168.1.1/')).toBe(false);
    expect(isAllowedImageUrl('https://172.16.0.1/')).toBe(false);
  });

  it('blocks non-https schemes, including ones with no network hop', () => {
    // `file:` would be read off the server's own disk; `data:`/`gopher:` are the classic SSRF pivots.
    expect(isAllowedImageUrl('file:///etc/passwd')).toBe(false);
    expect(isAllowedImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(false);
    expect(isAllowedImageUrl('gopher://127.0.0.1:6379/_FLUSHALL')).toBe(false);
    // http on an allowed host is still refused — downgradeable in transit.
    expect(isAllowedImageUrl('http://img.youtube.com/vi/x/default.jpg')).toBe(false);
  });

  it('blocks host lookalikes', () => {
    // Each of these passes one of the tempting shortcuts. The userinfo case is the sharpest: to a
    // reader it looks like the allowed host, but the real host is everything after the `@`.
    expect(isAllowedImageUrl('https://img.youtube.com@attacker.test/x.jpg')).toBe(false);
    expect(isAllowedImageUrl('https://img.youtube.com.attacker.test/x.jpg')).toBe(false);
    expect(isAllowedImageUrl('https://evil-i.vimeocdn.com/x.jpg')).toBe(false);
    expect(isAllowedImageUrl('https://attacker.test/img.youtube.com/x.jpg')).toBe(false);
    expect(isAllowedImageUrl('https://attacker.test/?x=https://img.youtube.com')).toBe(false);
  });

  it('rejects anything that is not a parseable url', () => {
    expect(isAllowedImageUrl('')).toBe(false);
    expect(isAllowedImageUrl('not a url')).toBe(false);
    expect(isAllowedImageUrl('/vi/x/default.jpg')).toBe(false);
    expect(isAllowedImageUrl(null)).toBe(false);
    expect(isAllowedImageUrl(undefined)).toBe(false);
    expect(isAllowedImageUrl(42)).toBe(false);
    expect(isAllowedImageUrl({ toString: () => 'https://img.youtube.com/x.jpg' })).toBe(false);
  });

  it('keeps the allowlist short', () => {
    // Not a style rule. Every entry is a host the server can be made to fetch on an unauthenticated
    // caller's behalf, so a growing list should be noticed in review rather than in an incident.
    expect(ALLOWED_IMAGE_HOSTS).toEqual(['img.youtube.com', 'i.vimeocdn.com']);
  });
});

describe('isValidDocumentRef', () => {
  it('accepts document ids and draft ids', () => {
    expect(isValidDocumentRef('abc123')).toBe(true);
    expect(isValidDocumentRef('drafts.abc123')).toBe(true);
    expect(isValidDocumentRef('page-home_v2')).toBe(true);
  });

  it('rejects anything that could break out of the id', () => {
    // The ref is interpolated into a GROQ string, so a quote or a bracket is the interesting case.
    expect(isValidDocumentRef('abc"]||*[_type=="user"')).toBe(false);
    expect(isValidDocumentRef('abc 123')).toBe(false);
    expect(isValidDocumentRef('')).toBe(false);
    expect(isValidDocumentRef(null)).toBe(false);
  });
});

describe('isValidFieldPath', () => {
  /*
   * The case whose absence let a 400-on-every-save ship for review.
   *
   * The original suite asserted only that dotted paths were *rejected*, which passed while the
   * feature was broken — `VideoUrlInput` builds `${idBase}.${thumbnailFieldKey}`, so every real call
   * is dotted, and `mediaSection` sits inside a page's `sections` array, so it is also keyed. A guard
   * is only as good as the legitimate input it lets through, and nothing here checked that.
   */
  it('accepts the paths VideoUrlInput actually produces', () => {
    // Top level: `idBase` empty, so the caller sends the bare key.
    expect(isValidFieldPath('thumbnail')).toBe(true);
    // Nested object.
    expect(isValidFieldPath('videoSection.thumbnail')).toBe(true);
    // Inside an array by key — the `mediaSection` case, and the shape Sanity's own `pathToString`
    // emits for a key segment.
    expect(isValidFieldPath('sections[_key=="a1b2c3d4"].thumbnail')).toBe(true);
    // Inside an array by index, and the tuple form `pathToString` can also emit.
    expect(isValidFieldPath('sections[0].thumbnail')).toBe(true);
    expect(isValidFieldPath('sections[0:2].thumbnail')).toBe(true);
    // Deeper nesting still resolves to one field.
    expect(isValidFieldPath('sections[_key=="a1b2"].media.thumbnail')).toBe(true);
  });

  it('rejects malformed paths', () => {
    expect(isValidFieldPath('.thumbnail')).toBe(false); // the leading-dot bug the caller used to emit
    expect(isValidFieldPath('thumbnail.')).toBe(false);
    expect(isValidFieldPath('a..b')).toBe(false);
    expect(isValidFieldPath('2image')).toBe(false);
    expect(isValidFieldPath('')).toBe(false);
    expect(isValidFieldPath(null)).toBe(false);
    expect(isValidFieldPath('field name')).toBe(false);
  });

  it('rejects accessor shapes Sanity would not emit', () => {
    // Anything inside the brackets other than an index, a tuple, or a `_key==` match.
    expect(isValidFieldPath('sections[_type=="page"].thumbnail')).toBe(false);
    expect(isValidFieldPath('sections[_key=="a"][0]==1].x')).toBe(false);
    expect(isValidFieldPath('sections[*].thumbnail')).toBe(false);
    expect(isValidFieldPath('sections[_key=="a\\"].x')).toBe(false);
    expect(isValidFieldPath('[0].thumbnail')).toBe(false);
  });

  it('is bounded, so a pathological value cannot be handed to the regex', () => {
    expect(isValidFieldPath(`${'a'.repeat(300)}.thumbnail`)).toBe(false);
    expect(isValidFieldPath(Array.from({ length: 20 }, () => 'a').join('.'))).toBe(false);
  });
});
