import classNames from '@/helpers/classNames';

import type { FieldProps } from '../FieldCommon/Field';
import Field from '../FieldCommon/Field';

import styles from './styles.module.scss';

interface FieldUrlProps extends FieldProps {
  placeholder?: string;
}

const FieldUrl = (props: FieldUrlProps) => {
  const { placeholder } = props;

  return (
    <Field {...props}>
      {({ field, hasError }) => (
        <input
          {...field}
          type="url"
          className={classNames(styles.input, { [styles.error]: hasError })}
          placeholder={placeholder}
        />
      )}
    </Field>
  );
};

export default FieldUrl;
