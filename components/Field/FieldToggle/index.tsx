import type { FieldProps } from '../FieldCommon/Field';
import Field from '../FieldCommon/Field';

import styles from './styles.module.scss';

interface FieldToggleProps extends FieldProps {
  placeholder?: string;
  disabled?: boolean;
}

const FieldToggle = (props: FieldToggleProps) => {
  const { name } = props;

  return (
    <Field {...props}>
      {({ field }) => (
        <>
          <input {...field} id={name} type="checkbox" className={styles.input} />
          <label htmlFor={name} className={styles.label}>
            <span className={styles.toggle}>
              <span className={styles.circle} />
            </span>
          </label>
        </>
      )}
    </Field>
  );
};

export default FieldToggle;
