import type { FC } from 'react';

import Section from '@/components/Section';
import stringClean from '@/helpers/stringClean';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IImageCarouselSection } from '@/tools/sanity/schema/sections/imageCarouselSection';

import CarouselTrack from './CarouselTrack';

import styles from './styles.module.scss';

/** Seconds each slide takes to pass, by the editor's speed setting. */
const SECONDS_PER_SLIDE = { fast: 3, medium: 5, slow: 8 } as const;

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
 * Each slide takes its photograph's own shape, nudged only when that is within about 6% of either of
 * the two slides before it — then by the smallest amount that clears both (`tools/helpers/carouselRatios`).
 * So most photographs are shown whole, and a run shot the same way still steps through slightly
 * different shapes and heights. What a nudge costs is cropped by `object-fit: cover`, around the
 * editor's hotspot — a few percent, not a detail. The shape is set on the slide, so the strip is laid
 * out at its final size on the server render and nothing shifts as the photographs arrive.
 *
 * ## Twelve at most, a different twelve each visit
 *
 * A published list can run to fifty. `CarouselTrack` shows up to `MAX_SLIDES` (12), chosen and
 * ordered at random per visit (`tools/helpers/pickSlides`). The page is cached and served
 * statically, so the pick has to happen in the browser: the server renders the first twelve in
 * published order, and the browser swaps in its own twelve as it hydrates — before any of them
 * has downloaded, since the images load lazily.
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

  const secondsPerSlide = SECONDS_PER_SLIDE[stringClean(speed ?? '') as keyof typeof SECONDS_PER_SLIDE] ?? 5;

  return (
    <Section
      full
      name="ImageCarouselSection"
      theme={getSectionTheme(props, 'light')}
      {...getSectionSpacingProps(props)}
    >
      <div className={styles.viewport}>
        <CarouselTrack images={slides} secondsPerSlide={secondsPerSlide} />
      </div>
    </Section>
  );
};

export default ImageCarouselSection;
