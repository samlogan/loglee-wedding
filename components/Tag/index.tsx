import Text from '@/components/Text';
import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

/** The drawn box, and only the box — see the note on `size` below. */
export type TagSize = 'sm' | 'md' | 'lg';
export type TagVariant = 'outline' | 'filled';

export interface TagProps {
  className?: string;
  /**
   * The chip's text. Required, and a plain string rather than `children`: a tag is a single run of
   * micro-copy, and taking nodes would invite a link or an icon into something that must stay
   * non-interactive.
   *
   * Sentence case in the CMS, capitals from `uppercase`. `text-transform` does **not** keep capitals
   * out of the accessible tree — Chromium names an element from its rendered text — so the stored
   * string is what a screen reader spells out, and it should read as a label.
   *
   * A **required** key with a nullable value, not an optional prop: every call site feeds this from
   * an optional CMS field, so the type has to accept one directly — but forgetting the attribute
   * altogether should still be a compile error rather than a chip with nothing in it.
   */
  label: string | null | undefined;
  /**
   * `filled` paints an opaque surface; `outline` paints a 1px `currentColor` stroke on nothing.
   *
   * **Over media, use `filled`.** The opaque fill is the whole legibility mechanism: it puts a known
   * background behind the label so the contrast is a property of the chip rather than of whatever
   * pixel of photograph happens to sit under it. `outline` over a photograph is legible only by
   * luck.
   */
  variant?: TagVariant;
  /**
   * The drawn box: `sm` is the caption chip (8×4 at desktop), `md` the schedule/venue chip (10×6),
   * `lg` the location pill (12×8).
   *
   * **`size` scales the padding and not the type.** Every chip in the design is set at 11px — the
   * pill is bigger than the caption because it has more air around the same word, not because the
   * word is bigger. The type is `--body-2xs` (fluid 10→11px) at every size; a call site drawn at a
   * pair that is not on the scale re-points `--tag-font-size` on its own class, which is what
   * `ModelViewer`'s badge does.
   *
   * The outer box is the same at a given size whichever `variant` is used: the padding is the drawn
   * inset **minus** the border, following the convention the button tokens set out — Figma hangs a
   * stroke outside the padding box and we put it inside.
   */
  size?: TagSize;
  /**
   * Writes `data-theme` on the chip itself, so it paints from the *other* theme's tokens while the
   * page keeps its own — the same inversion `sections/TwoColumnListSection` applies to its panel.
   *
   * This is how one component draws both the light chip over the Lodge photographs and the dark chip
   * over the Stay ones. Omit it and the chip inherits whatever theme its section set, which is right
   * for a chip on a page rather than on an image — and which resolves identically, because the one
   * value that differs between the themes (the filled chip's ink: pine on light, off-white on dark)
   * is carried by inheritance rather than by a selector.
   *
   * Every filled instance the design draws is reproduced by `theme` alone. No call site needs a
   * colour override.
   */
  theme?: ProjectTheme;
  /**
   * Passed through to `Text`. Omitted gives the mono role's default (Medium), which is the quiet
   * register; `bold` is the loud one the location pills are drawn in.
   *
   * Note the tracking follows the weight rather than a prop of its own — that is `Text`'s decision,
   * not this one — but a `bold` tag is tracked at 0.1em rather than the role's loud 0.2em. See the
   * stylesheet.
   */
  weight?: ProjectFontWeight;
  /**
   * Capitals from CSS. Off by default, because the one existing filled chip in the repo prints a
   * file name and a file name has to be reproduced verbatim.
   */
  uppercase?: boolean;
  /**
   * A hairline on a `filled` chip, for the case the design draws it on: a dark chip over a dark
   * photograph (node 16:152), where fill alone does not separate the box from the image.
   *
   * Costs no box — the border is subtracted from the padding, so a bordered chip measures the same
   * as an unbordered one at the same `size`.
   */
  bordered?: boolean;
}

/**
 * A presentational boxed mono chip — the caption over a photograph, the location pill, the file
 * badge inside the model arch (Figma nodes 16:258, 16:137, 16:152, 16:644, 16:261/263/265).
 *
 * ## Deliberately not `Button` or `Link`
 *
 * `Button` is the only other chip-shaped thing in the repo and is the wrong reuse: it renders a
 * `<button>` and `Link` renders an `<a>`, either of which would put a focusable control in the tab
 * order for something that does nothing when you press it. This renders a `<span>` with no handler,
 * no `href`, no `tabindex` and no role — the `NotInteractive` story asserts every one of those.
 *
 * ## Why it exists at all
 *
 * `sections/ScheduleSection`'s `.location` carried a long note predicting this component and naming
 * `components/ModelViewer`'s `.badge` as the near-miss second instance — the same object in the
 * filled treatment rather than the outline one. Both are migrated onto it. The trigger the note set
 * ("the third") fired several times over: the Lodge and Stay pages draw five more between them.
 *
 * ## What it owns, and what it does not
 *
 * The box, the radius, the padding, the fill and the type. **Not** position. A chip over media is
 * placed by the section that owns the media — `position: absolute` and its insets belong there, and
 * every consuming rule should hold nothing but placement. See the stylesheet for the idiom.
 */
const Tag = (props: TagProps) => {
  const {
    bordered = false,
    className,
    label,
    size = 'md',
    theme,
    uppercase = false,
    variant = 'filled',
    weight
  } = props;

  /*
   * Nothing rather than an empty box.
   *
   * A tag is a painted surface with padding, so an empty label publishes a small blank rectangle —
   * and, with no text in it, one with no accessible name either. Every call site guards its own
   * field as well; this is the backstop for the one that forgets.
   */
  if (!label?.trim()) {
    return null;
  }

  return (
    <Text
      as="span"
      className={classNames(
        styles.tag,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        { [styles.bordered]: bordered && variant === 'filled' },
        className
      )}
      text={label}
      textTransform={uppercase ? 'uppercase' : undefined}
      theme={theme}
      variant="mono"
      weight={weight}
    />
  );
};

export default Tag;
