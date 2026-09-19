import { describe, expect, it } from 'vitest';

import detectVideoPlatform from './videoPlatform';

describe('detectVideoPlatform', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    'youtube.com/watch?v=dQw4w9WgXcQ'
  ])('recognises %s as YouTube', (url) => {
    expect(detectVideoPlatform(url)).toBe('youtube');
  });

  it.each(['https://vimeo.com/76979871', 'https://player.vimeo.com/video/76979871', 'https://www.vimeo.com/76979871'])(
    'recognises %s as Vimeo',
    (url) => {
      expect(detectVideoPlatform(url)).toBe('vimeo');
    }
  );

  it('tolerates the whitespace a paste leaves around a URL', () => {
    expect(detectVideoPlatform('  https://youtu.be/dQw4w9WgXcQ\n')).toBe('youtube');
  });

  it.each([
    undefined,
    null,
    '',
    'https://example.com/video.mp4',
    'https://www.youtube.com/',
    'https://vimeo.com/channels'
  ])('is unknown for %s', (url) => {
    expect(detectVideoPlatform(url)).toBe('unknown');
  });
});
