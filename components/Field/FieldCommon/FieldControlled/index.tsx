import { useController } from 'react-hook-form';

import classNames from '@/helpers/classNames';

import type { FieldProps } from '../Field';
import FieldContainer from '../FieldContainer';
import FieldError from '../FieldError';
import FieldLabel from '../FieldLabel';
import useFieldError from '../helpers/useFieldError';

import styles from './styles.module.scss';

export interface FieldControlledProps extends Omit<FieldProps, 'register' | 'valueAs'> {}

const FieldControlled = (props: FieldProps) => {
  const { className, control, children, name, label, errors, validate, required = false } = props;

  const { field } = useController({
    control,
    name,
    rules: { required: true, validate }
  });

  const error = useFieldError({ errors, name });
  const classes = classNames(styles.container, { [styles.error]: !!error }, className);

  if (typeof children !== 'function') {
    throw new TypeError('Field children must be a function');
  }

  return (
    <FieldContainer className={classes}>
      <FieldLabel name={name} text={label} required={required} />
      {children({ field: { ...field, className: 'input' }, hasError: !!error })}
      <FieldError error={error} />
    </FieldContainer>
  );
};

export default FieldControlled;
