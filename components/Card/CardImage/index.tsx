import classNames from '@/helpers/classNames';

import type { ImageProps } from '../../Image';
import Image from '../../Image';

import styles from './styles.module.scss';

export interface CardImageProps {
  className?: string;
  image: ImageProps;
  overlay?: boolean;
  title: string;
}

const CardImage = (props: CardImageProps) => {
  const { className, image, overlay = true, title } = props;
  const classes = classNames(styles.image, className);

  return (
    <div className={classes}>
      {overlay && <div className={styles.overlay} />}
      <Image {...image} alt={title} aspectRatio="1-1" />
    </div>
  );
};

export default CardImage;
