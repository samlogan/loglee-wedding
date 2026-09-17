import NextImage from 'next/image';
import { createElement } from 'react';

import * as icons from '@/assets/icons';
import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

export interface IconProps {
  className?: string;
  title?: keyof typeof icons;
  size?: 'sm' | 'md' | 'lg' | 'fluid';
  color?: ProjectColor;
}

const Icon = (props: IconProps) => {
  const { className, title, size, color } = props;

  const classes = classNames(styles.icon, styles[`size_${size}`], styles[`color_${color}`], className);
  const icon = title && icons[title];

  if (!icon) {
    return null;
  }

  // Render svg icons imported as URL (e.g. "import Icon from './icon.svg?url'")
  if (icon?.src) {
    return (
      <span className={classes}>
        <NextImage src={icon.src} alt={icon.title} width={32} height={32} />
      </span>
    );
  }

  // Render svg icons imported as React Component
  return <span className={classes}>{createElement(icon)}</span>;
};

export default Icon;
