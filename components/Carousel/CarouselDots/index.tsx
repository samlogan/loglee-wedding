'use client';

import { useEffect, useState } from 'react';
import type { FC } from 'react';

import classNames from '@/helpers/classNames';

import { useCarouselContext } from '../CarouselProvider';

import styles from './styles.module.scss';

interface CarouselDotsProps {
  className?: string;
}

const CarouselDots: FC<CarouselDotsProps> = (props) => {
  const { className } = props;
  const [, setTick] = useState(0);
  const { carousel } = useCarouselContext();

  const selectedIndex = carousel?.selectedScrollSnap() ?? 0;
  const scrollSnaps = carousel?.scrollSnapList() ?? [];

  useEffect(() => {
    if (!carousel) {
      return;
    }

    const onChange = () => setTick((t) => t + 1);

    carousel.on('select', onChange);
    carousel.on('reInit', onChange);

    return () => {
      carousel.off('select', onChange);
      carousel.off('reInit', onChange);
    };
  }, [carousel]);

  const handleOnClick = (index: number) => {
    if (!carousel) {
      return;
    }
    carousel.scrollTo(index);
  };

  return (
    <div className={classNames(styles.container, className)}>
      {scrollSnaps?.map((_, index) => (
        <button
          key={index}
          role="button"
          aria-label={`Go to slide ${index + 1}`}
          className={classNames(styles.dot, {
            [styles.selected]: index === selectedIndex
          })}
          onClick={() => handleOnClick(index)}
        />
      ))}
    </div>
  );
};

export default CarouselDots;
