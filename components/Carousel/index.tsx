'use client';

import type { EmblaOptionsType } from 'embla-carousel';
import EmblaPluginClassNames from 'embla-carousel-class-names';
import useEmblaCarousel from 'embla-carousel-react';
import { useEffect } from 'react';
import type { FC, ReactNode } from 'react';

import classNames from '@/helpers/classNames';

import { useCarouselContext } from './CarouselProvider';

import styles from './styles.module.scss';

interface CarouselProps {
  className?: string;
  containerClassName?: string;
  children: ReactNode;
  options?: EmblaOptionsType;
  autoplay?: boolean;
  onSlideChange?: (index: number) => void;
}

const Carousel: FC<CarouselProps> = (props) => {
  const {
    options = {
      active: true
    },
    children,
    className,
    containerClassName,
    onSlideChange
  } = props;

  const [emblaRef, embla] = useEmblaCarousel(options, [EmblaPluginClassNames()]);

  const { setCarousel } = useCarouselContext();

  useEffect(() => {
    if (!embla) {
      return;
    }

    const onSelect = () => {
      setCarousel({
        ...embla,
        progress: embla.scrollProgress(),
        scrollNextAllowed: embla.canScrollNext(),
        scrollPrevAllowed: embla.canScrollPrev()
      });
      if (onSlideChange) {
        onSlideChange(embla.selectedScrollSnap());
      }
    };

    const onInit = () => {
      onSelect();
      setCarousel({
        ...embla,
        progress: embla.scrollProgress(),
        scrollNextAllowed: embla.canScrollNext(),
        scrollPrevAllowed: embla.canScrollPrev()
      });
    };

    // Initial calls
    onSelect();
    onInit();
    embla.on('init', onInit);
    embla.on('select', onSelect);
    return () => {
      if (embla) {
        embla.off('init', onInit);
        embla.off('select', onSelect);
      }
    };
  }, [embla, onSlideChange, setCarousel]);

  const containerClasses = classNames(styles.wrapper, containerClassName, { [styles.active]: !!options?.active });

  return (
    <div data-name="Carousel" ref={emblaRef} className={classNames(styles.container, className)}>
      <div className={containerClasses}>{children}</div>
    </div>
  );
};

export default Carousel;
