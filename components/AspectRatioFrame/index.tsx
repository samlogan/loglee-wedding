import type { ReactNode } from 'react';

import classNames from '@/helpers/classNames';
import stringClean from '@/helpers/stringClean';
import type { FrameAspectRatio } from '@/tools/sanity/schema/common/aspectRatioFields';

import styles from './styles.module.scss';

export interface AspectRatioFrameProps {
  className?: string;
  children: ReactNode;
  /** The shape above the tablet breakpoint. `fullscreen` is the height of the viewport. */
  desktop?: FrameAspectRatio | null;
  /** The shape below the tablet breakpoint. */
  mobile?: FrameAspectRatio | null;
  /** Round the corners — for a frame inside the page container, where a square edge reads as cut off. */
  rounded?: boolean;
}

/**
 * A full-width box with one aspect ratio on desktop and another on mobile — the editor-chosen pair
 * from `aspectRatioFields` — for the child to fill.
 *
 * Both choices are classes switched in CSS, so the server render already has the right box and
 * nothing shifts when a map or a video loads into it. The classes only set custom properties that
 * `.frame` reads, which keeps the two independent without a class per combination.
 *
 * `overflow: hidden` and `position: relative`, so a child can fill it with `position: absolute`
 * and a `cover` crop cannot spill out.
 */
const AspectRatioFrame = (props: AspectRatioFrameProps) => {
  const { children, className, desktop, mobile, rounded = false } = props;

  // `stringClean`, because in draft mode a stega payload rides on every string — including these.
  const desktopRatio = stringClean(desktop ?? '') || '21x9';
  const mobileRatio = stringClean(mobile ?? '') || '4x5';

  return (
    <div
      className={classNames(
        styles.frame,
        styles[`desktop_${desktopRatio}`],
        styles[`mobile_${mobileRatio}`],
        { [styles.rounded]: rounded },
        className
      )}
    >
      {children}
    </div>
  );
};

export default AspectRatioFrame;
