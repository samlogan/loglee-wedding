import { useController } from 'react-hook-form';

import classNames from '@/helpers/classNames';

import type { FieldProps } from '../Field';
import FieldContainer from '../FieldContainer';
import FieldError from '../FieldError';
import FieldLabel from '../FieldLabel';
import useFieldError from '../helpers/useFieldError';

import styles from './styles.module.scss';

export interface FieldControlledProps extends Omit<FieldProps, 'register' | 'valueAs'> {}

/**
 * `Field`, for a control react-hook-form cannot register natively — its value is set by code, like
 * the stepper's buttons, rather than read off a DOM input.
 *
 * It hands the render prop the same wiring `Field` does, and until MAM-1902 it did not: no `id`, so
 * the `<label htmlFor>` pointed at nothing and the control had no accessible name; no
 * `aria-invalid` / `aria-describedby`, and an error with no `id` to be described by, so an invalid
 * value was shown in red and announced to nobody. `rules.required` was also hard-coded to `true`
 * whatever the `required` prop said — the prop drew the asterisk and nothing else.
 */
const FieldControlled = (props: FieldProps) => {
  const { className, control, children, name, label, errors, validate, required = false } = props;

  const { field } = useController({
    control,
    name,
    rules: { required, validate }
  });

  const error = useFieldError({ errors, name });
  const classes = classNames(styles.container, { [styles.error]: !!error }, className);

  if (typeof children !== 'function') {
    throw new TypeError('Field children must be a function');
  }

  return (
    <FieldContainer className={classes}>
      <FieldLabel name={name} text={label} required={required} />
      {children({
        field: {
          ...field,
          'aria-describedby': error ? `${name}-error` : undefined,
          'aria-invalid': !!error || undefined,
          className: 'input',
          id: name
        },
        hasError: !!error
      })}
      <FieldError name={name} error={error} />
    </FieldContainer>
  );
};

export default FieldControlled;
