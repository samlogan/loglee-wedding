// @ts-nocheck
// TODO: This component has broken imports and missing dependencies (react-phone-number-input, FieldError, FieldLabel)
import classNames from 'classnames';
import { lazy, Suspense } from 'react';
import { useController } from 'react-hook-form';

import 'react-phone-number-input/style.css';
import FieldError from '../FieldError';
import FieldLabel from '../FieldLabel';
import useFieldError from '../helpers/useFieldError';

import * as styles from './styles.module.scss';

const PhoneInput = lazy(() =>
  import('react-phone-number-input').then((module) => ({
    default: module.default
  }))
);

const validatePhone = async (phoneNumber: string): Promise<boolean> => {
  const { isValidPhoneNumber } = await import('react-phone-number-input');
  return isValidPhoneNumber(phoneNumber);
};

interface FieldPhoneProps {
  placeholder?: string;
  className?: string;
  name: string;
  label?: string;
  required?: boolean;
}

const FieldPhone = (props: FieldPhoneProps) => {
  const { placeholder, className, name, label, required } = props;

  const { field } = useController({
    name,
    rules: {
      required: { message: 'Please enter valid number', value: true },
      validate: async (value: string) => {
        const isValid = await validatePhone(value);
        return isValid || 'Please enter valid number';
      }
    }
  });

  const error = useFieldError({ name });

  return (
    <div className={classNames(styles.container, className)}>
      <FieldLabel name={name} text={label} required={required} />
      <div className={classNames(styles.input, { [styles.error]: !!error })}>
        <Suspense fallback={<input type="phone" placeholder={placeholder} />}>
          <PhoneInput defaultCountry="AU" placeholder={placeholder} {...field} />
        </Suspense>
      </div>
      <FieldError message={error} />
    </div>
  );
};

export default FieldPhone;
