export type VideoPlatform = 'youtube' | 'vimeo' | 'unknown';

/*
 * Every URL shape an editor is likely to paste: the address bar (`watch?v=`, `vimeo.com/123`), the
 * share button (`youtu.be/…`), Shorts, and the `src` of an embed code (`/embed/…`,
 * `player.vimeo.com/video/…`). ReactPlayer plays all of them; only the recognition was narrower.
 */
const YOUTUBE_PATTERN =
  /^(https?:\/\/)?((www|m)\.)?(youtube\.com\/(watch\?(.*&)?v=|embed\/|shorts\/|live\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)[\w-]+/;
const VIMEO_PATTERN = /^(https?:\/\/)?(www\.|player\.)?vimeo\.com\/(video\/)?\d+/;

const detectVideoPlatform = (url?: string | null): VideoPlatform => {
  const value = url?.trim();

  if (!value) {
    return 'unknown';
  }

  if (YOUTUBE_PATTERN.test(value)) {
    return 'youtube';
  }

  if (VIMEO_PATTERN.test(value)) {
    return 'vimeo';
  }

  return 'unknown';
};

export default detectVideoPlatform;
