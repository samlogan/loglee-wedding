import type { ReactNode } from 'react';
import { createElement } from 'react';

import classNames from '@/helpers/classNames';
import stringTrim from '@/tools/helpers/stringTrim';

import styles from './styles.module.scss';

type TextSpacing = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface TextBaseProps {
  children?: ReactNode;
  className?: string;
  id?: string;
  /*
   * For a run that is decoration rather than content — a visible ordinal, a state word the control
   * beside it already announces. Spelt as a prop rather than spread from `...rest`, because `Text`
   * takes no arbitrary DOM props and adding a spread would let any attribute through unchecked.
   */
  ariaHidden?: boolean;
  text?: string | number | undefined | null;
  textTrim?: number;
  textTrimEnd?: string;
  /*
   * `legend`, `dt` and `dd` are here because the mono variant's call sites need them —
   * `FieldCheckbox`'s group label is a `<legend>` and `PlayerCard`'s stats are a description list.
   * Before MAM-1927 those three elements were the reason those call sites could not go through
   * `Text` even if the type role had existed.
   */
  as?:
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'p'
    | 'span'
    | 'ol'
    | 'ul'
    | 'li'
    | 'dt'
    | 'dd'
    | 'legend'
    | 'blockquote';
  color?: ProjectColor;
  spacing?: TextSpacing | [TextSpacing, TextSpacing]; // array maps to class names spacing_top_<value>, spacing_bottom_<value>
  weight?: ProjectFontWeight;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize';
  alignment?: ProjectTextAlignment;
}

/*
 * `variant` x `size` is an unvalidated cross product, and this union fences exactly one edge of it.
 *
 * The standing hazard: `size` is emitted unconditionally as `styles[`size_${size}`]`, and the CSS
 * only has rules for the combinations that exist — so `<Text variant="display" size="xl">` already
 * type-checks and renders with no size rule behind it. Fixing that in general means a discriminated
 * union with an arm per variant, which is a larger API change and is not this ticket.
 *
 * What is this ticket is not making it worse. `mono` introduced `2xs`, a rung below the body scale's
 * floor with a rule only under `.variant_mono`. Putting `'2xs'` into the shared `ProjectFontSize`
 * would have added two new silently-unsized combinations (`body`/`2xs`, `heading`/`2xs`) — the exact
 * failure above, newly minted. So `2xs` lives in `ProjectMonoFontSize` and this two-arm union makes
 * it reachable only with `variant="mono"`, which in exchange also closes `mono` against the sizes it
 * has no rule for (`md` and up).
 *
 * Narrowing rather than writing rules for the dead combinations, because `2xs` on a proportional
 * face is not a step anything is drawn at — a rule for it would be inventing a design decision to
 * satisfy a type. The other three variants keep their existing cross product untouched.
 */
type TextTypeProps =
  | { variant?: Exclude<ProjectFontVariant, 'mono'>; size?: ProjectFontSize }
  | { variant: 'mono'; size?: ProjectMonoFontSize };

export type TextProps = TextBaseProps & TextTypeProps;

const Text = (props: TextProps) => {
  const {
    as = 'span',
    ariaHidden,
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

  const TextComponent = createElement(
    as,
    { className: classes, ...(id && { id }), ...(ariaHidden && { 'aria-hidden': true }) },
    children || textValue
  );

  return TextComponent;
};

export default Text;
