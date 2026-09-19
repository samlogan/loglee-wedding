import Text from '@/components/Text';
import classNames from '@/helpers/classNames';

import type { FieldProps } from '../FieldCommon/Field';
import Field from '../FieldCommon/Field';

import styles from './styles.module.scss';

export interface FieldToggleProps extends Omit<FieldProps, 'valueAs'> {
  placeholder?: string;
  disabled?: boolean;
  /**
   * The word painted beside the switch in each state — "Yes" / "No", say. Optional, and decoration:
   * the switch announces its own on/off state, so both words are hidden from assistive technology
   * and exist to give sighted readers a second, non-colour cue alongside the thumb's position.
   */
  checkedText?: string;
  uncheckedText?: string;
}

/**
 * An on/off switch — a native checkbox with `role="switch"`, which is what a screen reader needs to
 * say "on" / "off" rather than "checked", with a drawn track and thumb over it.
 *
 * It replaced a version whose checkbox was `display: none`: out of the tab order and out of the
 * accessibility tree, so the only way to flip it was a pointer. The input is now transparent and
 * stretched over the track, which keeps focus, Space and the announced state native.
 *
 * Its `<label>` is `Field`'s own, pointing at the input by `id`; the wrapper here is a second label
 * so a press on the state word flips it too. Everything inside that wrapper is `aria-hidden`, so the
 * accessible name is still exactly the field's label.
 */
const FieldToggle = (props: FieldToggleProps) => {
  const { checkedText, uncheckedText, ...fieldProps } = props;
  const { name } = fieldProps;

  return (
    <Field {...fieldProps}>
      {({ field, hasError }) => (
        <label className={styles.control} htmlFor={name}>
          <input {...field} className={styles.input} role="switch" type="checkbox" />
          <span aria-hidden="true" className={classNames(styles.track, { [styles.error]: hasError })}>
            <span className={styles.thumb} />
          </span>
          {(checkedText || uncheckedText) && (
            <Text ariaHidden as="span" className={styles.state} weight="medium">
              <span className={styles.stateUnchecked}>{uncheckedText}</span>
              <span className={styles.stateChecked}>{checkedText}</span>
            </Text>
          )}
        </label>
      )}
    </Field>
  );
};

export default FieldToggle;
