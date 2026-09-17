'use client';

import type { MouseEvent, ReactNode } from 'react';

import type { IconProps } from '@/components/Icon';
import Icon from '@/components/Icon';
import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

export interface ButtonProps {
  children?: ReactNode;
  className?: string;
  id?: string;
  text?: string | number;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  to?: string;
  ariaLabel?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  theme?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'rounded' | 'square' | 'pill';
  icon?: IconProps['title'];
  iconPosition?: 'left' | 'right';
  outline?: boolean;
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
    ariaLabel = '',
    iconPosition = 'left',
    text,
    icon,
    tabIndex
  } = props;

  const classes = classNames(
    styles.button,
    styles[`variant_${variant}`],
    styles[`theme_${theme}`],
    styles[`size_${size}`],
    { [styles.outline]: outline },
    className
  );

  const onClickHandler = (event: MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <button
      aria-label={ariaLabel}
      type={type}
      disabled={disabled}
      className={classes}
      id={id}
      tabIndex={tabIndex}
      onClick={onClickHandler}
    >
      {iconPosition === 'left' && icon && <Icon title={icon} className={styles.icon} />}
      {children || text}
      {iconPosition === 'right' && icon && <Icon title={icon} className={styles.icon} />}
    </button>
  );
};

export default Button;
