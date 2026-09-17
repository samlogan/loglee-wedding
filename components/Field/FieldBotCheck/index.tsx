import type { FieldProps } from '../FieldCommon/Field';
import Field from '../FieldCommon/Field';

import styles from './styles.module.scss';

interface FieldBotCheckProps extends Omit<FieldProps, 'name'> {}

const FieldBotCheck = (props: FieldBotCheckProps) => (
  <Field {...props} name="_gotcha" className={styles.container}>
    {({ field }) => <input {...field} type="checkbox" tabIndex={-1} autoComplete="off" />}
  </Field>
);

export default FieldBotCheck;
