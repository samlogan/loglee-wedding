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
  to?: string;
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
    theme,
    size,
    variant,
    disabled = false,
    outline = false,
    mono = false,
    arrow,
    fullWidth = false,
    fullWidthMobile = false,
    ariaLabel = '',
    iconPosition = 'left',
    text,
    icon,
    tabIndex
  } = props;

  const classes = buttonClasses({ theme, size, variant, outline, mono, arrow, fullWidth, fullWidthMobile }, className);

  const onClickHandler = (event: MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(event);
    }
  };

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
      onClick={onClickHandler}
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
