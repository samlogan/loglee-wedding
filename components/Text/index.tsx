import type { ReactNode } from 'react';
import { createElement } from 'react';

import classNames from '@/helpers/classNames';
import stringTrim from '@/tools/helpers/stringTrim';

import styles from './styles.module.scss';

type TextSpacing = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface TextProps {
  children?: ReactNode;
  className?: string;
  id?: string;
  text?: string | number | undefined | null;
  textTrim?: number;
  textTrimEnd?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'ol' | 'ul' | 'li' | 'blockquote';
  variant?: ProjectFontVariant;
  size?: ProjectFontSize;
  color?: ProjectColor;
  spacing?: TextSpacing | [TextSpacing, TextSpacing]; // array maps to class names spacing_top_<value>, spacing_bottom_<value>
  weight?: ProjectFontWeight;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize';
  alignment?: ProjectTextAlignment;
}

const Text = (props: TextProps) => {
  const {
    as = 'span',
    children,
    className,
    id,
    text,
    variant = 'body',
    size,
    color,
    weight,
    spacing,
    textTrim = 0,
    textTrimEnd = '...',
    textTransform,
    alignment = 'left'
  } = props;

  if (!as) {
    return children || text;
  }

  const spacingClasses =
    typeof spacing === 'string'
      ? [styles[`spacing_${spacing}`]]
      : [styles[`spacing_top_${spacing?.[0]}`], styles[`spacing_bottom_${spacing?.[1]}`]];

  const classes = classNames(
    styles.text,
    styles[`variant_${variant}`],
    styles[`color_${color}`],
    styles[`size_${size}`],
    styles[`weight_${weight}`],
    styles[`textTransform_${textTransform}`],
    styles[`alignment_${alignment}`],
    ...spacingClasses,
    className
  );

  let textValue = text;
  if (text && textTrim > 0) {
    const [textTrimmed] = stringTrim({ end: textTrimEnd, length: textTrim, text });
    textValue = textTrimmed;
  }

  const TextComponent = createElement(as, { className: classes, ...(id && { id }) }, children || textValue);

  return TextComponent;
};

export default Text;
