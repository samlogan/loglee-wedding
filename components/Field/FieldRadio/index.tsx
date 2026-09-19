import Text from '@/components/Text';
import classNames from '@/helpers/classNames';

import type { FieldProps } from '../FieldCommon/Field';
import Field from '../FieldCommon/Field';

import styles from './styles.module.scss';

export interface FieldRadioOption {
  /** What the group submits when this option is picked. Unique within `options`. */
  value: string;
  label: string;
}

/**
 * `valueAs` is dropped for the reason `FieldCheckbox` drops it: coercing a radio group's string value
 * to a number is never what a caller means, and the compiler would otherwise accept it.
 */
export interface FieldRadioProps extends Omit<FieldProps, 'valueAs'> {
  options: FieldRadioOption[];
  /**
   * `default` — a radio dot beside each label.
   * `pill` — the design system's `Chip` pair (Figma node 1:988 / 1:990): an ink outline, filled when
   * picked. The RSVP comp's room preference (node 1:832).
   */
  variant?: 'default' | 'pill';
}

/**
 * A single-choice group — a real `<fieldset>` whose `<legend>` names it, one native radio per option.
 *
 * Built the way `FieldCheckbox` is, for the same reasons, and it replaced a version that had none of
 * them: its inputs were `display: none`, so the group could not be reached or operated without a
 * pointer; its label was a `<label htmlFor={name}>` pointing at nothing, so the group had no name; and
 * each option's `id` was its `value`, which is not a valid id once the value contains a space.
 *
 * - `label` never reaches `Field`, which would draw a `<label>` for a control that does not exist.
 *   It becomes the `<legend>` instead.
 * - The inputs are transparent and stretched over their option rather than hidden, so Tab reaches
 *   the group, the arrow keys move the selection and a screen reader reads the checked state — all
 *   native radio-group behaviour, none of it reimplemented.
 * - `field.className` is dropped, so the form theme's `.input` rule never sizes the invisible radio.
 */
const FieldRadio = (props: FieldRadioProps) => {
  const { disabled = false, label, options, required = false, variant = 'default', ...fieldProps } = props;
  const { name } = fieldProps;

  return (
    // `required` is withheld while disabled — see the identical note in `FieldCheckbox`.
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
          <div className={classNames(styles.options, styles[`variant_${variant}`])}>
            {options?.map((option, index) => (
              <label className={styles.option} key={option.value}>
                <input {...field} className={styles.input} id={`${name}-${index}`} type="radio" value={option.value} />
                <span className={classNames(styles.control, { [styles.error]: hasError })}>
                  {variant === 'default' && <span aria-hidden="true" className={styles.dot} />}
                  <span className={styles.label}>{option.label}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </Field>
  );
};

export default FieldRadio;
