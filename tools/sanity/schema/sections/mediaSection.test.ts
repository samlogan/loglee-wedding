import { describe, expect, it } from 'vitest';

import { validateMediaImage, validateVideoUrl } from './mediaSection';

/** The context Sanity hands a field validator: the section object the field sits in. */
const on = (mediaType?: 'image' | 'video') => ({ parent: { mediaType } });

const IMAGE = { _type: 'imageElementSimple', asset: { _ref: 'image-abc', _type: 'reference' } };

describe('validateMediaImage', () => {
  it('requires an image on an image section', () => {
    expect(validateMediaImage(undefined, on('image'))).toMatch(/Add an image/);
    expect(validateMediaImage(IMAGE, on('image'))).toBe(true);
  });

  it('treats a section with no media type yet as an image section, matching the projection', () => {
    expect(validateMediaImage(undefined, on())).toMatch(/Add an image/);
  });

  it('does not ask a video section for an image', () => {
    expect(validateMediaImage(undefined, on('video'))).toBe(true);
  });
});

describe('validateVideoUrl', () => {
  it('ignores the field on an image section, whatever is left in it', () => {
    expect(validateVideoUrl(undefined, on('image'))).toBe(true);
    expect(validateVideoUrl('https://example.com/film.mp4', on('image'))).toBe(true);
  });

  it('requires a link on a video section', () => {
    expect(validateVideoUrl(undefined, on('video'))).toMatch(/Add a YouTube or Vimeo link/);
    expect(validateVideoUrl('   ', on('video'))).toMatch(/Add a YouTube or Vimeo link/);
  });

  it('accepts YouTube and Vimeo links', () => {
    expect(validateVideoUrl('https://youtu.be/dQw4w9WgXcQ', on('video'))).toBe(true);
    expect(validateVideoUrl('https://vimeo.com/76979871', on('video'))).toBe(true);
  });

  it('rejects a link the player cannot play, rather than letting the section render nothing', () => {
    expect(validateVideoUrl('https://example.com/film.mp4', on('video'))).toMatch(/Only YouTube and Vimeo/);
  });
});
