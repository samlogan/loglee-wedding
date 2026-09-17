'use client';

import useCarousel from 'embla-carousel-react';
import { Children, isValidElement, useCallback, useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';

import { useCarouselContext } from '@/components/Carousel/CarouselProvider';
import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

interface CarouselThumbnailProps {
  children?: ReactNode;
  className?: string;
}

const CarouselThumbnail: FC<CarouselThumbnailProps> = (props) => {
  const { children, className } = props;
  const [, setTick] = useState(0);
  const { carousel: emblaApi } = useCarouselContext();

  const [emblaThumbsRef, emblaThumbsApi] = useCarousel({
    dragFree: true
  });

  const selectedIndex = emblaApi?.selectedScrollSnap() ?? 0;

  useEffect(() => {
    if (!emblaApi || !emblaThumbsApi) {
      return;
    }

    const onChange = () => {
      setTick((t) => t + 1);
      emblaThumbsApi.scrollTo(emblaApi.selectedScrollSnap());
    };

    // Initial thumb sync
    emblaThumbsApi.scrollTo(emblaApi.selectedScrollSnap());

    emblaApi.on('select', onChange);
    emblaApi.on('reInit', onChange);

    return () => {
      emblaApi.off('select', onChange);
      emblaApi.off('reInit', onChange);
    };
  }, [emblaApi, emblaThumbsApi]);

  const handleClick = useCallback(
    (index: number) => {
      if (!emblaApi || !emblaThumbsApi) {
        return;
      }
      emblaApi.scrollTo(index);
    },
    [emblaApi, emblaThumbsApi]
  );

  const childrenWithProps = Children.map(children, (child, index) => {
    if (!isValidElement(child)) {
      return null;
    }

    return (
      <span
        key={`thumb-${index}`}
        role="button"
        aria-label={`Go to slide ${index + 1}`}
        onClick={() => handleClick(index)}
        className={classNames(styles.item, {
          [styles.selected]: index === selectedIndex
        })}
      >
        {child}
      </span>
    );
  });

  return (
    <div ref={emblaThumbsRef} className={classNames(styles.container, className)}>
      <div className={styles.wrapper}>{childrenWithProps}</div>
    </div>
  );
};

export default CarouselThumbnail;
