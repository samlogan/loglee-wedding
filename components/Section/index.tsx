import type { ReactNode, Ref } from 'react';

import classNames from '@/helpers/classNames';
import stringClean from '@/tools/helpers/stringClean';

import Container from '../Container';
import type { ContainerWidth } from '../Container';
import type { SectionSpacing } from './types';

import styles from './style.module.scss';

export interface SectionProps {
  className?: string;
  containerClassName?: string;
  children: ReactNode;
  as?: 'section' | 'header' | 'footer' | 'div';
  theme?: ProjectTheme;
  full?: boolean; // no container
  containerWidth?: ContainerWidth;
  spacing?: SectionSpacing | [SectionSpacing, SectionSpacing];
  removeTopSpacing?: boolean;
  removeBottomSpacing?: boolean;
  name?: string;
  /**
   * React 19 ref-as-prop, replacing `forwardRef`.
   *
   * This previously declared `forwardRef<HTMLElement, SectionProps>` and then never attached the
   * ref, so the API lied: anything measuring a Section had to wrap it in a `<div ref>` and measure
   * that instead. `tools/storybook/measure.tsx` exists partly because of this.
   *
   * Typed `Ref<HTMLElement>` because `as` can render four different tags. That is the correct
   * common contract today; if `as` ever gains `'a'`, a caller needing `HTMLAnchorElement` members
   * would need a narrower generic rather than this union.
   */
  ref?: Ref<HTMLElement>;
}

const Section = (props: SectionProps) => {
  const {
    className,
    containerClassName,
    as = 'section',
    theme = 'light',
    spacing = 'lg',
    full = false,
    containerWidth,
    name,
    removeBottomSpacing,
    removeTopSpacing,
    children,
    ref
  } = props;

  const SectionComponent = as;

  let spacingTop = Array.isArray(spacing) ? spacing[0] : stringClean(spacing);
  if (removeTopSpacing) {
    spacingTop = 'none';
  }

  let spacingBottom = Array.isArray(spacing) ? spacing[1] : stringClean(spacing);
  if (removeBottomSpacing) {
    spacingBottom = 'none';
  }

  const classes = classNames(
    styles.section,
    { [styles[`spacing_bottom_${spacingBottom}`]]: !!spacingBottom },
    { [styles[`spacing_top_${spacingTop}`]]: !!spacingTop },
    className
  );

  return (
    <SectionComponent
      data-name={name}
      data-theme={theme}
      className={classes}
      // The `as` union renders four different tags, all of which are HTMLElement subtypes. The cast
      // narrows to whatever tag was chosen; `Ref<HTMLElement>` stays the right public contract.
      ref={ref as Ref<HTMLDivElement>}
    >
      {full ? (
        children
      ) : (
        <Container width={containerWidth} className={containerClassName}>
          {children}
        </Container>
      )}
    </SectionComponent>
  );
};

export default Section;
