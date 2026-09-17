'use client';

import { m, useMotionValue, useTransform } from 'motion/react';
import { useEffect } from 'react';
import type { FC } from 'react';

import classNames from '@/helpers/classNames';

import { useCarouselContext } from '../CarouselProvider';

import styles from './styles.module.scss';

interface CarouselProgressProps {
  className?: string;
}

const CarouselProgress: FC<CarouselProgressProps> = (props) => {
  const { className } = props;
  const { carousel } = useCarouselContext();

  const progress = useMotionValue(0);
  const width = useTransform(progress, (value) => `${value}%`);

  useEffect(() => {
    if (!carousel) {
      return;
    }

    const onScroll = () => {
      const currentProgress = Math.max(0.05, Math.min(1, carousel.scrollProgress()));

      progress.set(currentProgress * 100);
    };

    carousel.on('scroll', onScroll);
    onScroll();

    return () => {
      carousel.off('scroll', onScroll);
    };
  }, [carousel, progress]);

  if (!carousel) {
    return null;
  }

  return (
    <div className={classNames(styles.container, className)}>
      <m.div className={styles.bar} style={{ width }} />
    </div>
  );
};

export default CarouselProgress;
