'use client';

import type { MouseEvent, ReactNode } from 'react';

import type { IconProps } from '@/components/Icon';
import Icon from '@/components/Icon';

import type { ButtonAppearanceProps } from './appearance';
import { ButtonArrow, buttonClasses } from './appearance';

import styles from './styles.module.scss';

export type { ButtonAppearanceProps, ButtonArrowDirection, ButtonSize, ButtonTheme, ButtonVariant } from './appearance';

export interface ButtonProps extends ButtonAppearanceProps {
  children?: ReactNode;
  className?: string;
  id?: string;
  text?: string | number;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  icon?: IconProps['title'];
  iconPosition?: 'left' | 'right';
  tabIndex?: number;
}

const Button = (props: ButtonProps) => {
  const {
    className,
    onClick,
    id,
    children,
    type = 'button',
    disabled = false,
    arrow,
    ariaLabel = '',
    iconPosition = 'left',
    text,
    icon,
    tabIndex
  } = props;

  /*
   * `props` whole, rather than a hand-assembled copy of the appearance axes.
   *
   * Nothing here renders from `theme`/`size`/`variant`/`outline`/`mono`/`fullWidth` directly — they
   * only ever became classes — and the copy had already gone stale, passing `arrow`, which
   * `buttonClasses` does not read. `ButtonProps` extends `ButtonAppearanceProps`, so handing the
   * object over keeps that list in exactly one place. (`Link` still destructures the same props, but
   * for a different reason: it spreads its rest onto an `<a>` and has to keep them off it.)
   */
  const classes = buttonClasses(props, className);

  return (
    <button
      /*
       * Omitted when empty, never emitted as `aria-label=""` — the same fix `Link` carries, for the
       * same reason. An empty `aria-label` overrides the accessible name rather than falling back to
       * the content, so an icon-only button (the carousel's previous/next) announced nothing at all.
       * `ariaLabel` defaults to `''`, so every button in the app was emitting one.
       */
      aria-label={ariaLabel || undefined}
      className={classes}
      disabled={disabled}
      id={id}
      onClick={onClick}
      tabIndex={tabIndex}
      type={type}
    >
      {arrow === 'left' && <ButtonArrow direction="left" />}
      {iconPosition === 'left' && icon && <Icon className={styles.icon} title={icon} />}
      {children || text}
      {iconPosition === 'right' && icon && <Icon className={styles.icon} title={icon} />}
      {arrow === 'right' && <ButtonArrow direction="right" />}
    </button>
  );
};

export default Button;
