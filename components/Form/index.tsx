import React, { Children, cloneElement, isValidElement, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useForm, FormProvider } from 'react-hook-form';

import classNames from '@/helpers/classNames';

import Field from '../Field';
import FieldBotCheck from '../Field/FieldBotCheck';
import type { FormSubmitProps } from './FormSubmit';
import FormSubmit from './FormSubmit';

import styles from './styles.module.scss';

interface FormProps {
  className?: string;
  onSubmit?: (values: Record<string, unknown>, methods: UseFormReturn) => Promise<void>;
  defaultValues?: Record<string, unknown>;
  children: ReactNode;
  validationSchema?: Record<string, unknown>;
  formId?: string;
  submitText?: string;
  layout?: 'grid' | 'normal' | 'flex';
  theme?: 'primary' | 'secondary';
  submitButton?: FormSubmitProps['submitButton'];
}

const Form = (props: FormProps) => {
  const {
    formId,
    className,
    onSubmit,
    children,
    layout = 'grid',
    defaultValues = {},
    submitButton,
    theme = 'primary'
    // validationSchema = {},
  } = props;

  const methods: UseFormReturn = useForm({
    defaultValues
    // resolver: validationSchema
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const onSubmitHandler = useCallback(
    async (values: Record<string, unknown>) => {
      if (values._gotcha) {
        return;
      }
      setIsSubmitting(true);
      if (onSubmit) {
        await onSubmit(values, methods);
      }
      setIsSubmitting(false);
    },
    [onSubmit, methods]
  );

  const classes = classNames(styles.form, styles[`theme_${theme}`], styles[`layout_${layout}`], className);
  return (
    <FormProvider {...methods}>
      <form id={formId} onSubmit={methods.handleSubmit(onSubmitHandler)} className={classes}>
        <FieldBotCheck register={methods?.register} />
        {Children.map(Children.toArray(children), (child) => {
          if (isValidElement(child)) {
            return cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              ...(child.props as Record<string, unknown>),
              control: methods?.control,
              errors: methods?.formState?.errors,
              register: methods?.register
            });
          }
          return child;
        })}
        <FormSubmit isSubmitting={isSubmitting} submitButton={submitButton} />
      </form>
    </FormProvider>
  );
};

export default Form;
