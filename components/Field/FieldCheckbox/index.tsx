import Text from '@/components/Text';
import classNames from '@/helpers/classNames';

import type { FieldProps } from '../FieldCommon/Field';
import Field from '../FieldCommon/Field';

import styles from './styles.module.scss';

export interface FieldCheckboxOption {
  /** The submitted value, and what `defaultValues[name]` holds for a pre-checked option. */
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

export interface FieldCheckboxProps extends FieldProps {
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
 * Three things here deliberately depart from the `FieldRadio` / `FieldToggle` siblings:
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
 * 3. **The input is transparent, not `display: none`.** Both siblings hide theirs outright, which
 *    removes them from the tab order and the accessibility tree — neither is operable by keyboard at
 *    all. This one is `opacity: 0` and stretched over the card, so it keeps native focus, Space
 *    toggling and the checked state a screen reader reads out.
 */
const FieldCheckbox = (props: FieldCheckboxProps) => {
  const { label, options, required = false, selectedText = 'In', unselectedText = 'Out', ...fieldProps } = props;
  const { name } = fieldProps;

  return (
    <Field {...fieldProps} required={required}>
      {({ field, hasError }) => (
        <fieldset className={styles.fieldset}>
          {label && (
            <legend className={styles.legend}>
              {label}
              {required && <span className={styles.required}>*</span>}
            </legend>
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
                    {option.eyebrow && <span className={styles.eyebrow}>{option.eyebrow}</span>}
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
                  <span aria-hidden="true" className={styles.indicator}>
                    <span className={styles.marker} />
                    <span className={styles.stateUnselected}>{unselectedText}</span>
                    <span className={styles.stateSelected}>{selectedText}</span>
                  </span>
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
