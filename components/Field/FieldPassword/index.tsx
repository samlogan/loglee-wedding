import classNames from '@/helpers/classNames';

import type { FieldProps } from '../FieldCommon/Field';
import Field from '../FieldCommon/Field';

import styles from './styles.module.scss';

interface FieldTextProps extends FieldProps {
  placeholder?: string;
}

const FieldText = (props: FieldTextProps) => {
  const { placeholder } = props;

  return (
    <Field {...props}>
      {({ field, hasError }) => (
        <input
          {...field}
          type="password"
          className={classNames(styles.input, { [styles.error]: hasError })}
          placeholder={placeholder}
        />
      )}
    </Field>
  );
};

export default FieldText;
