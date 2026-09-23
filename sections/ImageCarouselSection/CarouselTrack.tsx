'use client';

import { useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

import Image from '@/components/Image';
import carouselRatios from '@/helpers/carouselRatios';
import classNames from '@/helpers/classNames';
import pickSlides, { MAX_SLIDES } from '@/helpers/pickSlides';
import type { IImageCarouselSection } from '@/tools/sanity/schema/sections/imageCarouselSection';

import styles from './styles.module.scss';

/**
 * One copy of the strip has to be at least as wide as the widest viewport's worth of slides (4.5 on
 * desktop), or the loop shows its seam. Short lists are repeated within the copy until it is.
 */
const MIN_SLIDES_PER_COPY = 6;

export type CarouselImage = NonNullable<IImageCarouselSection['images']>[number];

/**
 * The photograph's own shape — its pixel dimensions less any crop the editor set, since
 * `components/Image` requests the cropped rect. `undefined` when the asset carries no dimensions.
 */
const naturalRatioOf = (image: CarouselImage): number | undefined => {
  const dimensions = image.asset?.metadata?.dimensions;
  if (!(dimensions?.width && dimensions.height)) {
    return undefined;
  }

  const { bottom = 0, left = 0, right = 0, top = 0 } = image.crop ?? {};
  const width = dimensions.width * (1 - left - right);
  const height = dimensions.height * (1 - top - bottom);

  return width > 0 && height > 0 ? width / height : undefined;
};

/**
 * A slide's shape, and how many standard widths it spans.
 *
 * Portrait and square slides are one standard width and grow taller as they narrow. A landscape
 * slide grows *wider* — `ratio ** 0.7` widths, so 3:2 spans 1.33 — and, because its width grows a
 * little slower than its shape, a little shorter too. Height therefore falls steadily from the
 * tallest portrait to the widest landscape: two slides of different shapes are never the same
 * height, which is why `carouselRatios` keeping neighbours' shapes apart keeps their heights apart too.
 */
const slideStyle = (ratio: number) =>
  ({ '--slide-span': ratio > 1 ? ratio ** 0.7 : 1, aspectRatio: ratio }) as CSSProperties;

/*
 * The visit's shuffle seed, held as an external store rather than state. The server has none — its
 * snapshot is `null`, so it renders the first twelve in published order and hydration matches — and
 * the client rolls once when first read. Unmounting clears it, so each visit gets a fresh pick while
 * re-renders within one visit keep the same one.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`, per the React Compiler conventions in
 * CLAUDE.md: no state is set in an effect.
 */
let roll: number | undefined;
const subscribe = () => () => {
  roll = undefined;
};
const getRoll = () => {
  roll ??= Math.random();
  return roll;
};
const getServerRoll = () => null;

export interface CarouselTrackProps {
  className?: string;
  /** Every published photograph with a file; the track shows up to `MAX_SLIDES` of them. */
  images: CarouselImage[];
  /** Seconds each slide takes to pass, from the editor's speed setting. */
  secondsPerSlide: number;
}

/**
 * The moving strip itself: up to twelve of the photographs, a different twelve each visit, each close
 * to its own shape and different from its neighbours. See the section's `index.tsx` for the design.
 */
const CarouselTrack = (props: CarouselTrackProps) => {
  const { className, images, secondsPerSlide } = props;

  const seed = useSyncExternalStore(subscribe, getRoll, getServerRoll);
  const slides = pickSlides(images, MAX_SLIDES, seed);

  // Repeated within one copy until it is wide enough to hide the seam. Only the first run is read.
  const repeats = Math.ceil(MIN_SLIDES_PER_COPY / slides.length);
  const copy = Array.from({ length: repeats }, (_, run) => slides.map((image) => ({ image, run }))).flat();
  const ratios = carouselRatios(copy.map(({ image }) => naturalRatioOf(image)));

  const renderCopy = (hidden: boolean) =>
    copy.map(({ image, run }, index) => {
      const isRepeat = hidden || run > 0;

      return (
        <li
          aria-hidden={isRepeat || undefined}
          className={styles.slide}
          key={`${hidden ? 'b' : 'a'}-${image._key ?? index}-${run}`}
          style={slideStyle(ratios[index])}
        >
          <Image
            {...image}
            altText={isRepeat ? '' : image.altText}
            sizes="(max-width: 768px) 67vw, (max-width: 1024px) 29vw, 22vw"
          />
        </li>
      );
    });

  return (
    <ul
      className={classNames(styles.track, className)}
      style={{ '--carousel-duration': `${copy.length * secondsPerSlide}s` } as CSSProperties}
    >
      {renderCopy(false)}
      {renderCopy(true)}
    </ul>
  );
};

export default CarouselTrack;
