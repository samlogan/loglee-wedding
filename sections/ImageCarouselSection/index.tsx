import type { CSSProperties, FC } from 'react';

import Image from '@/components/Image';
import Section from '@/components/Section';
import carouselRatios from '@/helpers/carouselRatios';
import stringClean from '@/helpers/stringClean';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IImageCarouselSection } from '@/tools/sanity/schema/sections/imageCarouselSection';

import styles from './styles.module.scss';

/** Seconds each slide takes to pass, by the editor's speed setting. */
const SECONDS_PER_SLIDE = { fast: 3, medium: 5, slow: 8 } as const;

/**
 * One copy of the strip has to be at least as wide as the widest viewport's worth of slides (4.5 on
 * desktop), or the loop shows its seam. Short lists are repeated within the copy until it is.
 */
const MIN_SLIDES_PER_COPY = 6;

type CarouselImage = NonNullable<IImageCarouselSection['images']>[number];

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
 * height, which is what lets `carouselRatios` guarantee neighbours differ in height as well as shape.
 */
const slideStyle = (ratio: number) =>
  ({ '--slide-span': ratio > 1 ? ratio ** 0.7 : 1, aspectRatio: ratio }) as CSSProperties;

/**
 * A strip of photographs moving slowly and continuously right to left, edge to edge of the viewport,
 * each close to its photograph's own shape. 1.5 across on a phone, more on wider screens. No controls.
 *
 * ## CSS, not Embla
 *
 * The strip never stops for a gesture and has no buttons, so there is nothing for a carousel library
 * to manage: it is one animated transform. The track holds the images twice and slides left by half
 * its own width, at which point the second copy sits exactly where the first began and the loop
 * restarts without a visible jump. No JavaScript, so it moves from first paint.
 *
 * ## Close to the photograph, different from its neighbours
 *
 * Each slide takes the shape nearest its photograph's own from a fine ladder, but never one either of
 * the two slides before it has — `tools/helpers/carouselRatios`. So a run of photos shot the same way
 * still steps through slightly different shapes and heights, and a portrait stays a portrait. The
 * photograph is cropped to its slide with `object-fit: cover`; the difference from its own shape is
 * a step on the ladder at most. The shape is set on the slide, so the strip is laid out at its final
 * size on the server render and nothing shifts as the photographs arrive.
 *
 * ## Motion
 *
 * It never stops by itself. With `prefers-reduced-motion` it does not move at all: the duplicate copy
 * is dropped and the strip becomes a row the reader can scroll themselves.
 *
 * The copies after the first are `aria-hidden` — they are the same photographs again, and a screen
 * reader should meet each once.
 */
const ImageCarouselSection: FC<IImageCarouselSection> = (props) => {
  const { images, speed } = props;

  const slides = (images ?? []).filter((image) => Boolean(image?.asset?.url));

  if (slides.length === 0) {
    return null;
  }

  // Repeated within one copy until it is wide enough to hide the seam. Only the first run is read.
  const repeats = Math.ceil(MIN_SLIDES_PER_COPY / slides.length);
  const copy = Array.from({ length: repeats }, (_, run) => slides.map((image) => ({ image, run }))).flat();
  const ratios = carouselRatios(copy.map(({ image }) => naturalRatioOf(image)));
  const secondsPerSlide = SECONDS_PER_SLIDE[stringClean(speed ?? '') as keyof typeof SECONDS_PER_SLIDE] ?? 5;

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
    <Section
      full
      name="ImageCarouselSection"
      theme={getSectionTheme(props, 'light')}
      {...getSectionSpacingProps(props)}
    >
      <div className={styles.viewport}>
        <ul
          className={styles.track}
          style={{ '--carousel-duration': `${copy.length * secondsPerSlide}s` } as CSSProperties}
        >
          {renderCopy(false)}
          {renderCopy(true)}
        </ul>
      </div>
    </Section>
  );
};

export default ImageCarouselSection;
