import type { JSX, ChangeEvent, ReactNode } from 'react';
import type { FieldErrors, UseFormReturn } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';

import classNames from '@/helpers/classNames';

import type { FieldContainerProps } from '../FieldContainer';
import FieldContainer from '../FieldContainer';
import FieldError from '../FieldError';
import FieldLabel from '../FieldLabel';
import useFieldError from '../helpers/useFieldError';

import styles from './styles.module.scss';

export interface FieldProps {
  /**
   * A node rather than a string so a caller can mark part of it as decoration — the RSVP form's
   * visible ordinal ("01 · ") is `aria-hidden` inside the label, which keeps it out of the control's
   * accessible name. A plain string still works everywhere it did.
   */
  label?: ReactNode;
  name: string;
  className?: string;
  required?: boolean;
  // eslint-disable-next-line typescript-eslint/no-explicit-any -- render prop receives dynamic field shape from react-hook-form
  children?: (props: { field: Record<string, any>; hasError: boolean }) => JSX.Element | JSX.Element[];
  validate?: (value: string) => boolean | string;
  /**
   * Called after react-hook-form has stored the new value, so `getValues` already reads it.
   *
   * `checked` is the control's state after the change, for the fields where `value` says nothing — a
   * checkbox or switch submits the same `value` ("on") whichever way it was flipped.
   */
  // eslint-disable-next-line typescript-eslint/no-explicit-any -- field shape varies by form registration
  onChange?: ({ value, checked, field }: { value: string; checked: boolean; field: any }) => void;
  disabled?: boolean;
  valueAs?: 'number' | 'date';
  register?: UseFormReturn['register'];
  control?: UseFormReturn['control'];
  errors?: FieldErrors;
  align?: FieldContainerProps['align'];
}

const Field = (props: FieldProps) => {
  const {
    className,
    onChange,
    valueAs,
    disabled = false,
    children,
    name,
    register,
    label,
    errors,
    validate,
    required = false,
    align
  } = props;

  const { register: registerContext } = useFormContext();
  const formRegister = register || registerContext;

  const field =
    formRegister &&
    formRegister(name, {
      required,
      validate,
      valueAsNumber: valueAs === 'number'
    });
  const error = useFieldError({ errors, name });
  const classes = classNames(styles.container, { [styles.error]: !!error }, className);

  if (typeof children !== 'function') {
    throw new TypeError('Field children must be a function');
  }

  const onChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    if (field?.onChange) {
      field.onChange(event);
    }
    if (onChange) {
      onChange({ checked: event.target.checked, field: props, value: event.target.value });
    }
  };

  return (
    <FieldContainer className={classes} align={align}>
      <FieldLabel name={name} text={label} required={required} />
      {children({
        field: {
          ...field,
          'aria-describedby': error ? `${name}-error` : undefined,
          'aria-invalid': !!error || undefined,
          className: classNames(styles.input, 'input'),
          disabled,
          id: name,
          onChange: onChangeHandler
        },
        hasError: !!error
      })}
      <FieldError name={name} error={error} />
    </FieldContainer>
  );
};

export default Field;
