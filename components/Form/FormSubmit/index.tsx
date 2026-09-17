import classNames from 'classnames';
import type { ReactNode } from 'react';

import Button from '@/components/Button';

import styles from './styles.module.scss';

export interface FormSubmitProps {
  submitButton?: {
    className?: string;
    hide?: boolean;
    text?: string;
    submitText?: string;
    disableButton?: boolean;
    component?: ReactNode;
  };
  isSubmitting?: boolean;
}

const SubmitButton = (props: FormSubmitProps) => {
  const { isSubmitting, submitButton } = props;
  const { className, hide = false, text = 'Submit', submitText = 'Submitting...', disableButton } = submitButton || {};
  const classes = classNames(styles.submitButton, className);

  if (hide) {
    return null;
  }

  return (
    <Button
      type="submit"
      className={classes}
      disabled={isSubmitting || disableButton}
      theme="primary"
      size="md"
      variant="pill"
    >
      {isSubmitting ? submitText : text}
    </Button>
  );
};

export default SubmitButton;
