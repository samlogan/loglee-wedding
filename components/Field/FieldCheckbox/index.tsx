import Text from '@/components/Text';
import classNames from '@/helpers/classNames';

import type { FieldProps } from '../FieldCommon/Field';
import Field from '../FieldCommon/Field';

import styles from './styles.module.scss';

export interface FieldCheckboxOption {
  /**
   * The submitted value, and what `defaultValues[name]` holds for a pre-checked option.
   *
   * Must be unique within `options`. react-hook-form matches checkboxes by `value`, so a repeated
   * one ties those cards together — ticking either ticks both, and the submitted array carries the
   * value twice. Nothing dedupes it; React's duplicate-key warning is the only signal, and only in
   * development.
   */
  value: string;
  /** The card's title. The bulk of the option's accessible name. */
  label: string;
  /**
   * The small mono line above the title — the date in the RSVP comp.
   *
   * Part of the accessible name rather than decoration: "FRI 12 FEB" is the only thing telling a
   * screen-reader user which "Arrival dinner" they are agreeing to.
   */
  eyebrow?: string;
}

/**
 * `valueAs` is dropped rather than inherited. `Field` feeds it straight to
 * `register(name, { valueAsNumber: valueAs === 'number' })`, which is meaningless for a group whose
 * value is a list of strings — and worse than meaningless, because the compiler accepts
 * `valueAs="number"` here and the coercion then silently mangles what the form submits. Omitting it
 * is the same shape `FieldBotCheck` uses to drop `name`.
 */
export interface FieldCheckboxProps extends Omit<FieldProps, 'valueAs'> {
  /**
   * Two or more. With a single option react-hook-form stops collecting into an array — its
   * `getCheckboxValue` branches on `options.length > 1` — and submits the bare `value` string, or
   * `false` when unchecked, which is not the `string[]` this component's contract promises below.
   */
  options: FieldCheckboxOption[];
  /**
   * The word in the indicator line when the option is selected / not selected.
   *
   * Defaulted to the RSVP comp's "IN", with "OUT" as its counterpart — the design draws only the
   * selected state. Both are uppercased in CSS, and both live inside an `aria-hidden` wrapper: the
   * state a screen reader announces is the native checkbox's own, never this text. See the note on
   * `.indicator` in the stylesheet.
   */
  selectedText?: string;
  unselectedText?: string;
}

/**
 * A multi-select group of cards, one checkbox each.
 *
 * Registered under a single `name`, so react-hook-form collects the checked `value`s into a
 * `string[]` — the shape the RSVP "attending" question wants. That is also why every input carries
 * the same `field` object and only its `id` and `value` differ.
 *
 * Three things here depart from the older `Field` types — and are the pattern `FieldRadio` and
 * `FieldToggle` were rebuilt on in MAM-1902:
 *
 * 1. **`label` never reaches `Field`.** `FieldCommon/Field` renders a `<label htmlFor={name}>`, which
 *    is wrong for a group — a `<label>` may only point at a single labelable control, and here there
 *    are three. Withholding it makes `FieldLabel` render `null` (it returns early with no text), and
 *    this component draws a real `<legend>` inside a real `<fieldset>` instead.
 *
 * 2. **`field.className` is dropped.** `Field` sets `className: classNames(styles.input, 'input')`,
 *    and `components/Form/styles.module.scss` targets that global `.input` with
 *    `padding: 16px 24px; border: 1px solid …`. The input here is an invisible overlay sized to the
 *    card, and `input` is not in the reset's `box-sizing: border-box` list — so inheriting that
 *    padding would push the hit area outside the card it is meant to cover. `className` is therefore
 *    set *after* the spread rather than merged into it.
 *
 *    Dropped rather than corrected, because it cannot be corrected from here: that stylesheet is
 *    **unlayered**, this one is in `@layer defaults`, and unlayered author styles outrank every
 *    layer. `.theme_primary :global(.input)` would beat anything this file declares no matter how
 *    specific, so merging the class back and adding `box-sizing: border-box` — the obvious-looking
 *    fix — would quietly restore the padding. `Form` also defaults to `theme="primary"`, so that
 *    rule is live by default rather than opt-in.
 *
 * 3. **The input is transparent, not `display: none`.** `FieldRadio` and `FieldToggle` used to hide
 *    theirs outright, which removed them from the tab order and the accessibility tree — neither was
 *    operable by keyboard at all. This one is `opacity: 0` and stretched over the card, so it keeps
 *    native focus, Space toggling and the checked state a screen reader reads out.
 */
const FieldCheckbox = (props: FieldCheckboxProps) => {
  const {
    disabled = false,
    label,
    options,
    required = false,
    selectedText = 'In',
    unselectedText = 'Out',
    ...fieldProps
  } = props;
  const { name } = fieldProps;

  return (
    /*
     * `required` is withheld while the group is disabled, and that is a correctness fix rather than
     * tidying. `Field` forwards `required` into `register()` but never forwards `disabled`, so
     * react-hook-form keeps validating the field — while `getCheckboxValue` filters disabled inputs
     * out of the values it collects. The two together make the rule unsatisfiable: a
     * `required disabled` group reports "This field is required" forever and blocks submit on a
     * control nobody can reach. Native constraint validation skips disabled controls for the same
     * reason.
     */
    <Field {...fieldProps} disabled={disabled} required={required && !disabled}>
      {({ field, hasError }) => (
        <fieldset className={styles.fieldset}>
          {label && (
            <Text
              as="legend"
              className={styles.legend}
              size="xs"
              textTransform="uppercase"
              variant="mono"
              weight="bold"
            >
              {label}
              {required && <span className={styles.required}>*</span>}
            </Text>
          )}
          <div className={styles.options}>
            {options?.map((option, index) => (
              <label className={styles.option} key={option.value}>
                {/*
                 * Wrapped by the `<label>` rather than tied to it with `htmlFor`, so the association
                 * holds without depending on `value` being a valid id token. The `id` is still made
                 * unique per option — `Field` hands every child the same `id={name}`, and three
                 * elements sharing one id is invalid and breaks any `aria-*` that points at it.
                 */}
                <input
                  {...field}
                  className={styles.input}
                  id={`${name}-${index}`}
                  type="checkbox"
                  value={option.value}
                />
                <span className={classNames(styles.card, { [styles.error]: hasError })}>
                  <span className={styles.body}>
                    {option.eyebrow && (
                      <Text
                        as="span"
                        className={styles.eyebrow}
                        size="2xs"
                        text={option.eyebrow}
                        textTransform="uppercase"
                        variant="mono"
                        weight="medium"
                      />
                    )}
                    <Text as="span" className={styles.title} text={option.label} weight="medium" />
                  </span>
                  {/*
                   * Decoration, and hidden because of it. The checkbox already announces "checked" /
                   * "not checked"; a second spoken "in"/"out" would be the same fact twice, and both
                   * words are in the DOM at once (CSS picks which is painted), so leaving it visible
                   * would read as "In Out" on every option.
                   *
                   * It is still doing real work for sighted users: the filled-vs-hollow marker and
                   * the word are the two non-colour differences between the states.
                   */}
                  <Text
                    ariaHidden
                    as="span"
                    className={styles.indicator}
                    size="2xs"
                    textTransform="uppercase"
                    variant="mono"
                    weight="bold"
                  >
                    <span className={styles.marker} />
                    <span className={styles.stateUnselected}>{unselectedText}</span>
                    <span className={styles.stateSelected}>{selectedText}</span>
                  </Text>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </Field>
  );
};

export default FieldCheckbox;
