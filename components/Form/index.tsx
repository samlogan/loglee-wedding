'use client';

import React, { Children, cloneElement, isValidElement, startTransition, useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { FieldErrors, UseFormReturn } from 'react-hook-form';
import { useForm, FormProvider } from 'react-hook-form';

import classNames from '@/helpers/classNames';

import FieldBotCheck from '../Field/FieldBotCheck';
import type { FormSubmitProps } from './FormSubmit';
import FormSubmit from './FormSubmit';

import styles from './styles.module.scss';

interface FormProps {
  className?: string;
  /**
   * Called with the validated values. Runs after `action` is dispatched when both are set, so a
   * caller can record what it sent without owning the submit path.
   */
  onSubmit?: (values: Record<string, unknown>, methods: UseFormReturn) => Promise<void> | void;
  /**
   * Ends the submit path in a server action: pass the dispatcher `useActionState` returns.
   *
   * The form is validated client-side first, and only a valid one is serialised — the `<form>`
   * element itself, through `new FormData`, so the action receives exactly what a browser without
   * JavaScript would post — and dispatched inside a transition, which is what keeps `isPending`
   * honest. The same function is set as the element's `action`, so the form still reaches the
   * server before the client bundle has loaded; `handleSubmit` calls `preventDefault`, which stops
   * React dispatching it a second time once it has.
   *
   * Client validation is a convenience here, never the gate. The action is a public endpoint.
   */
  action?: (formData: FormData) => void;
  /**
   * Errors that came back from the server, keyed the way react-hook-form keys its own — nested for a
   * dotted name. They are shown through the same `FieldError` path as client errors, and a field's
   * clears the way a client error does, when it next validates.
   *
   * Memoise it. react-hook-form re-applies the object whenever its reference changes.
   */
  errors?: FieldErrors;
  defaultValues?: Record<string, unknown>;
  children: ReactNode;
  validationSchema?: Record<string, unknown>;
  formId?: string;
  submitText?: string;
  layout?: 'grid' | 'normal' | 'flex';
  /**
   * `underline` is the design's own input — no box, a single rule beneath, the page showing
   * through. See the note on it in the stylesheet.
   */
  theme?: 'primary' | 'secondary' | 'underline';
  submitButton?: FormSubmitProps['submitButton'];
}

const Form = (props: FormProps) => {
  const {
    action,
    errors,
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

  const formRef = useRef<HTMLFormElement>(null);

  const methods: UseFormReturn = useForm({
    defaultValues,
    errors
    // resolver: validationSchema
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const onSubmitHandler = useCallback(
    async (values: Record<string, unknown>) => {
      if (values._gotcha) {
        return;
      }
      const form = formRef.current;
      if (action && form) {
        const formData = new FormData(form);
        startTransition(() => action(formData));
      }
      if (onSubmit) {
        setIsSubmitting(true);
        await onSubmit(values, methods);
        setIsSubmitting(false);
      }
    },
    [action, onSubmit, methods]
  );

  const classes = classNames(styles.form, styles[`theme_${theme}`], styles[`layout_${layout}`], className);
  return (
    <FormProvider {...methods}>
      {/*
       * `noValidate` because react-hook-form is the validator. Without it the browser runs its own
       * constraint checks first — `type="email"`, a number input's `min`/`max` — and a failing one
       * cancels the submit event, so the form's own messages, `aria-invalid` and focus handling
       * never run and the reader gets a browser tooltip instead.
       */}
      <form
        action={action}
        className={classes}
        id={formId}
        noValidate
        onSubmit={methods.handleSubmit(onSubmitHandler)}
        ref={formRef}
      >
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
