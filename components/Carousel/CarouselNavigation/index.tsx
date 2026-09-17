'use client';

import Button from '@/components/Button';
import type { ButtonAppearanceProps } from '@/components/Button/appearance';
import classNames from '@/helpers/classNames';

import { useCarouselContext } from '../CarouselProvider';

import styles from './styles.module.scss';

export interface CarouselNavigationProps {
  className?: string;
  overlay?: boolean;
  /*
   * Appearance only, deliberately narrower than `ButtonProps`.
   *
   * This object is spread *after* the props below, so typing it as the full `ButtonProps` let a
   * caller pass `onClick` and silently disable scrolling, or `disabled` and defeat the end-of-track
   * guards. The only thing a consumer has a legitimate reason to change here is how the arrows look.
   */
  button?: ButtonAppearanceProps;
}

const CarouselNavigation = (props: CarouselNavigationProps) => {
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
      {/*
       * `size` is not decoration here: `--button-icon-size` gives the icon its dimensions, and an
       * icon-only control with no size prop would also have zero padding — no tap target at all.
       */}
      <Button
        onClick={onPrev}
        className={styles.button}
        disabled={!carousel.scrollPrevAllowed}
        icon="arrowLeft"
        ariaLabel="Previous Slide"
        size="md"
        variant="ui"
        {...button}
      />
      <Button
        onClick={onNext}
        className={styles.button}
        disabled={!carousel.scrollNextAllowed}
        icon="arrowRight"
        ariaLabel="Next Slide"
        size="md"
        variant="ui"
        {...button}
      />
    </div>
  );
};

export default CarouselNavigation;
