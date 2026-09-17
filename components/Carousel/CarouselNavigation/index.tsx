import type { FC } from 'react';

import type { ButtonProps } from '@/components/Button';
import Button from '@/components/Button';
import classNames from '@/helpers/classNames';

import { useCarouselContext } from '../CarouselProvider';

import styles from './styles.module.scss';

interface CarouselNavigationProps {
  className?: string;
  overlay?: boolean;
  button?: ButtonProps;
}

const CarouselNavigation: FC<CarouselNavigationProps> = (props) => {
  const { className, overlay = false, button = {} } = props;
  const { carousel } = useCarouselContext();
  if (!carousel) {
    return null;
  }

  const onPrev = () => {
    carousel.scrollPrev();
  };

  const onNext = () => {
    carousel.scrollNext();
  };

  return (
    <div
      className={classNames(styles.container, className, {
        [styles.overlay]: overlay
      })}
    >
      <Button
        onClick={onPrev}
        className={styles.button}
        disabled={!carousel.scrollPrevAllowed}
        icon="arrowLeft"
        ariaLabel="Previous Slide"
        tabIndex={-1}
        {...button}
      />
      <Button
        onClick={onNext}
        className={styles.button}
        disabled={!carousel.scrollNextAllowed}
        icon="arrowRight"
        ariaLabel="Next Slide"
        tabIndex={-1}
        {...button}
      />
    </div>
  );
};

export default CarouselNavigation;
