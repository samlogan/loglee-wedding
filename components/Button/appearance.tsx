import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

/**
 * Which colour pair fills the control.
 *
 * Not to be confused with `ProjectTheme` (`light` | `dark`), which is the *surface* a section sits
 * on. These are different axes that unfortunately share a word: a `theme="primary"` button appears
 * on both project themes and takes its pine-or-off-white fill from whichever is active.
 *
 * `accent` is signal/300 under near-black ink — the RSVP action and the design's "ACCENT / UI"
 * control. It is reserved for interactive states and should not be used as static decoration.
 */
export type ButtonTheme = 'primary' | 'secondary' | 'accent';

export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Shape, except for the last two.
 *
 * `bare` (the design's "← BACK") and `content` (a link inside rich text) have no box at all. They
 * live on this axis because `content` already did, and moving it now would break every consumer
 * that passes `variant`.
 */
export type ButtonVariant = 'rounded' | 'square' | 'pill' | 'ui' | 'bare' | 'content';

export type ButtonArrowDirection = 'left' | 'right';

/**
 * The appearance surface shared by `Button` and `Link`.
 *
 * Both render the same control — the design draws every one of them as a Figma "Link" — so the
 * props that decide how it looks are declared once here and the behavioural props stay on each
 * component. `buttonClasses` is the single place the class list is composed, which is what stops
 * the two drifting.
 */
export interface ButtonAppearanceProps {
  theme?: ButtonTheme;
  size?: ButtonSize;
  variant?: ButtonVariant;
  /** Draw the control instead of filling it: transparent fill, border and label in the theme colour. */
  outline?: boolean;
  /** Set the label in JetBrains Mono, uppercase and tracked — the design's UI-chrome controls. */
  mono?: boolean;
  /** A typographic arrow before or after the label. Decorative, hidden from assistive technology. */
  arrow?: ButtonArrowDirection;
  /** Stretch to the container at every width. */
  fullWidth?: boolean;
  /** Stretch to the container at and below the `tablet` breakpoint only. */
  fullWidthMobile?: boolean;
}

/**
 * Compose the class list for a button-shaped control.
 *
 * Note the object form for every boolean: `classNames` takes
 * `string | number | Record<string, unknown> | null | undefined` and has no `false` branch, so
 * `fullWidth && styles.fullWidth` would push the literal `false` through `typeof arg === 'object'`
 * and land on `Object.entries(false)` — empty, so it silently contributes nothing rather than
 * erroring. The object form is the only one that actually works.
 *
 * `styles[`size_${undefined}`]` is `undefined`, which `classNames` drops, so an unset axis needs no
 * guard of its own.
 */
export const buttonClasses = (props: ButtonAppearanceProps, className?: string): string | undefined => {
  const { theme, size, variant, outline, mono, fullWidth, fullWidthMobile } = props;

  return classNames(
    styles.button,
    styles[`theme_${theme}`],
    styles[`size_${size}`],
    styles[`variant_${variant}`],
    {
      [styles.outline]: outline,
      [styles.mono]: mono,
      [styles.fullWidth]: fullWidth,
      [styles.fullWidthMobile]: fullWidthMobile
    },
    className
  );
};

const ARROW_GLYPHS: Record<ButtonArrowDirection, string> = {
  left: '←',
  right: '→'
};

/**
 * The arrow on "RSVP →", "SWITCH PLAYER → LAUREN" and "← BACK".
 *
 * A glyph rather than an `Icon`, because the design sets it in the label's own font at the label's
 * own size; an SVG would need a size token per button size to keep up, and would not pick up the
 * mono face when `mono` is set.
 *
 * `aria-hidden` because it is decoration: the destination is already in the label, and an arrow read
 * aloud as "rightwards arrow" adds nothing. Anything the arrow alone would have conveyed belongs in
 * `ariaLabel`.
 */
export const ButtonArrow = ({ direction }: { direction: ButtonArrowDirection }) => (
  <span aria-hidden="true" className={classNames(styles.arrow, styles[`arrow_${direction}`])}>
    {ARROW_GLYPHS[direction]}
  </span>
);
