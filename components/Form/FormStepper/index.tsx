'use client';

import { Children, cloneElement, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { UseFormReturn, FieldValues } from 'react-hook-form';
import { useForm, FormProvider } from 'react-hook-form';

import Button from '@/components/Button';
import classNames from '@/helpers/classNames';

import FormStep from './FormStep';

import styles from './styles.module.scss';

interface FormStepperProps {
  children: ReactNode;
  className?: string;
  showHeading?: boolean;
  onSubmit?: (formValues: FieldValues, methods: UseFormReturn) => void;
  defaultValues?: Record<string, unknown>;
  nextStepText?: string;
  previousStepText?: string;
}

const FormStepper = (props: FormStepperProps) => {
  const {
    children,
    className,
    showHeading = true,
    onSubmit,
    defaultValues,
    nextStepText = 'Continue',
    previousStepText = 'Back to previous step'
  } = props;

  const filteredChildren = Children.toArray(children) as React.ReactElement<Record<string, any>>[];
  const childrenCount = filteredChildren.length;
  const [activeStep, setActiveStep] = useState(0);
  const [lastStep, setLastStep] = useState('');
  const progress = ((activeStep + 1) / childrenCount) * 100;
  const currentStepProps = filteredChildren[activeStep]?.props;
  const currentStepTitle = currentStepProps?.title;
  const currentStepHideNext = currentStepProps?.hideNext;
  const currentIsLastStep = activeStep === childrenCount - 1;
  const [validateMode, setValidateMode] = useState<'onSubmit' | 'onChange'>('onSubmit');

  const methods = useForm({
    defaultValues: defaultValues || {},
    reValidateMode: 'onChange',
    mode: validateMode
  });

  const onSubmitHandler = useCallback(
    (formValues: FieldValues) => {
      if (onSubmit) {
        onSubmit(formValues, methods);
      }
    },
    [onSubmit, methods]
  );

  const nextStep = useCallback(async () => {
    const isValid = await methods.trigger();
    if (!isValid) {
      setValidateMode('onChange');
      return;
    }
    if (activeStep < childrenCount - 1) {
      setActiveStep(activeStep + 1);
      setValidateMode('onSubmit');
      setLastStep('next');
    }
  }, [methods, activeStep, childrenCount]);

  const previousStep = useCallback(() => {
    setLastStep('previous');
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  }, [activeStep]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < childrenCount) {
        setActiveStep(step);
      }
    },
    [childrenCount]
  );

  const childrenWithProps = filteredChildren.map((child, index) => {
    const isCurrentStep = index === activeStep;
    const isLastStep = index === childrenCount - 1;
    const isFirstStep = index === 0;
    const isPrevious = index < activeStep;
    const isNext = index > activeStep;

    if (!child && isCurrentStep && (lastStep === 'next' || !lastStep) && !isLastStep) {
      setActiveStep(activeStep + 1);
      return null;
    }

    if (!child && isCurrentStep && lastStep === 'previous' && !isFirstStep) {
      setActiveStep(activeStep - 1);
      return null;
    }

    return cloneElement(child, {
      ...child.props,
      goToStep,
      isCurrentStep,
      isFirstStep,
      isLastStep,
      isNext,
      isPrevious,
      methods,
      nextStep,
      previousStep
    });
  });

  const classes = classNames(styles.steps, className);

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmitHandler)} className={classes}>
        {showHeading && currentStepTitle && (
          <div className={styles.heading}>
            <div className={styles.title}>{currentStepTitle}</div>
          </div>
        )}
        {childrenCount > 1 && (
          <div className={styles.progress}>
            <div className={styles.progressInner} style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className={styles.content}>
          <div className={styles.wrapper}>{childrenWithProps}</div>
        </div>
        <div className={styles.footer}>
          {!currentStepHideNext && !currentIsLastStep && (
            <Button className={styles.next} onClick={nextStep}>
              {nextStepText}
            </Button>
          )}
          {currentIsLastStep && (
            <Button className={styles.next} type="submit">
              Submit
            </Button>
          )}
          {activeStep > 0 && (
            <Button className={styles.previous} onClick={previousStep} theme="secondary">
              {previousStepText}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
};

FormStepper.Step = FormStep;

export default FormStepper;
