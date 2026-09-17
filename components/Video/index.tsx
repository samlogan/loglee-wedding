import ReactPlayer from 'react-player';

import styles from './styles.module.scss';

export interface VideoProps {
  url?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  altText?: string;
}

const detectVideoPlatform = (url?: string) => {
  const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
  const vimeoPattern = /^(https?:\/\/)?(www\.)?vimeo\.com\/\d+/;

  if (!url) {
    return 'unknown';
  }

  if (youtubePattern.test(url)) {
    return 'youtube';
  } else if (vimeoPattern.test(url)) {
    return 'vimeo';
  }
  return 'unknown';
};

const Video = (props: VideoProps) => {
  const { url, controls = true, autoPlay, altText } = props;
  const videoPlatform = detectVideoPlatform(url);

  if (videoPlatform === 'youtube') {
    return (
      <div className={styles.youtubeWrapper}>
        <ReactPlayer src={url} title={altText} width="100%" height="100%" controls={controls} playing={autoPlay} />
      </div>
    );
  }

  if (videoPlatform === 'vimeo') {
    return (
      <div className={styles.vimeoWrapper}>
        <ReactPlayer src={url} title={altText} width="100%" height="100%" controls={controls} playing={autoPlay} />
      </div>
    );
  }

  if (videoPlatform === 'unknown') {
    return <div>Unsupported video platform or invalid URL</div>;
  }

  return null;
};

export default Video;
