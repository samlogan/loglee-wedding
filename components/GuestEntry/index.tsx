'use client';

import { useActionState } from 'react';
import type { ReactNode } from 'react';

import Button from '@/components/Button';
import Field from '@/components/Field';
import Form from '@/components/Form';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';

import { GUEST_ENTRY_INITIAL_STATE, GUEST_ID_FIELD } from './contract';
import type { GuestEntryAction } from './contract';

import styles from './styles.module.scss';

export interface GuestEntryProps {
  className?: string;
  /** Checks the ID and signs the guest in. A prop, so the form never imports the server. */
  action: GuestEntryAction;
  /** Where to go once signed in. Sent with the ID so the action can redirect there. */
  next?: string;
  /** The couple's names, above the form. */
  names: string;
}

/**
 * `Form` hands every direct child a `register` prop; a component takes it and drops it, where a
 * `<div>` would write it to the DOM. The fields inside read the form from context, so they still work.
 */
const FormBody = ({ children }: { children: ReactNode }) => children;

/**
 * The door to the site: one field for the guest ID printed in the invitation email, and a button.
 * Every page sends a guest without the cookie here; see `proxy.ts`.
 */
const GuestEntry = (props: GuestEntryProps) => {
  const { action, className, names, next } = props;
  const [state, formAction, isPending] = useActionState(action, GUEST_ENTRY_INITIAL_STATE);

  return (
    <div className={classNames(styles.entry, className)}>
      <Text
        as="p"
        className={styles.eyebrow}
        size="2xs"
        text="You're invited"
        textTransform="uppercase"
        variant="mono"
      />
      <Text as="h1" size="lg" text={names} textTransform="uppercase" variant="display" />
      <Text as="p" className={styles.intro} size="lg">
        Enter the guest ID from your invitation to see the details of the weekend.
      </Text>
      <Form
        action={formAction}
        className={styles.form}
        defaultValues={{ [GUEST_ID_FIELD]: '' }}
        layout="normal"
        submitButton={{ hide: true }}
        theme="underline"
      >
        <FormBody>
          {next && <input name="next" type="hidden" value={next} />}
          <Field.Text
            label="Guest ID"
            name={GUEST_ID_FIELD}
            placeholder="e.g. SAM-4821"
            required
            validate={(value) => Boolean(value?.trim()) || 'Enter your guest ID'}
          />
          <div className={styles.alert} role="alert">
            {state.status === 'error' && !isPending && <Text as="p" text={state.message} />}
          </div>
          <Button className={styles.submit} size="lg" theme="accent" type="submit" variant="rounded">
            {isPending ? 'Checking…' : 'Enter'}
          </Button>
        </FormBody>
      </Form>
    </div>
  );
};

export default GuestEntry;
