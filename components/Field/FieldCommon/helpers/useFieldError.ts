import type { FieldErrors } from 'react-hook-form';
import { useFormContext, get } from 'react-hook-form';

interface UseFieldErrorProps {
  name: string;
  errors?: FieldErrors;
}

const useFieldError = (props: UseFieldErrorProps) => {
  const { name, errors } = props;
  const contextMethods = useFormContext();
  const error = get(errors || contextMethods.formState.errors, name);

  if (!error) {
    return null;
  }

  return error;
};

export default useFieldError;
