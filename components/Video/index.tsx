import ReactPlayer from 'react-player';

import classNames from '@/helpers/classNames';
import detectVideoPlatform from '@/helpers/videoPlatform';

import styles from './styles.module.scss';

export interface VideoProps {
  url?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  altText?: string;
  /**
   * Fill the parent instead of drawing a 16:9 box — for a frame whose shape the caller owns, like
   * `MediaSection`'s. The player letterboxes inside it.
   */
  fill?: boolean;
  /**
   * Autoplay, muted and looping — ambient video. Browsers only allow autoplay when muted, so the two
   * are one decision rather than two props that fail silently apart.
   */
  ambient?: boolean;
}

const Video = (props: VideoProps) => {
  const { url, controls = true, autoPlay, altText, className, fill = false, ambient = false } = props;
  const videoPlatform = detectVideoPlatform(url);
  const src = url?.trim();
  const playerProps = {
    controls,
    height: '100%',
    loop: ambient,
    muted: ambient,
    playing: ambient || autoPlay,
    playsInline: true,
    src,
    title: altText,
    width: '100%'
  };

  if (videoPlatform === 'youtube') {
    return (
      <div className={classNames(styles.youtubeWrapper, { [styles.fill]: fill }, className)}>
        <ReactPlayer {...playerProps} />
      </div>
    );
  }

  if (videoPlatform === 'vimeo') {
    return (
      <div className={classNames(styles.vimeoWrapper, { [styles.fill]: fill }, className)}>
        <ReactPlayer {...playerProps} />
      </div>
    );
  }

  if (videoPlatform === 'unknown') {
    return <div>Unsupported video platform or invalid URL</div>;
  }

  return null;
};

export default Video;
