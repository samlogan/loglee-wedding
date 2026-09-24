'use client';

import { useActionState } from 'react';
import type { ReactNode } from 'react';

import Button from '@/components/Button';
import Field from '@/components/Field';
import Form from '@/components/Form';
import Image from '@/components/Image';
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
  /** The couple, in order — stacked as the invitation email and the home hero draw them. */
  partners: readonly [string, string?];
  /** The handwritten line under the names. */
  byline?: string;
  /** The date, as the bar at the top shows it — "12–14.02.27". */
  date?: string;
  /** The line at the foot — "12–14 Feb 2027 · The Lodge Jamberoo". */
  summary?: string;
  /** The photo under the names, from Wedding Settings. */
  image?: SanityImageSimple | null;
}

/**
 * `Form` hands every direct child a `register` prop; a component takes it and drops it, where a
 * `<div>` would write it to the DOM. The fields inside read the form from context, so they still work.
 */
const FormBody = ({ children }: { children: ReactNode }) => children;

/**
 * The door to the site, drawn like the invitation email a guest has just come from: the couple's
 * names with the handwritten byline, the photo, then a card with one field for the guest ID the
 * email gave them. Every page sends a guest without the cookie here; see `proxy.ts`.
 */
const GuestEntry = (props: GuestEntryProps) => {
  const { action, byline = 'are getting married', className, date, image, next, partners, summary } = props;
  const [state, formAction, isPending] = useActionState(action, GUEST_ENTRY_INITIAL_STATE);
  const [first, second] = partners;
  const initials = partners
    .filter(Boolean)
    .map((name) => name?.charAt(0).toUpperCase())
    .join('&');

  return (
    <div className={classNames(styles.entry, className)}>
      <div aria-hidden="true" className={styles.bar}>
        <span>{initials}</span>
        {date && <span>{date}</span>}
      </div>

      <Text as="h1" className={styles.names} textTransform="uppercase" variant="display">
        <span className={styles.name}>
          {first}
          {second && ' &'}
        </span>
        {second && (
          <>
            {' '}
            <span className={styles.name}>{second}</span>
          </>
        )}
      </Text>
      {byline && (
        <Text as="p" className={styles.byline} size="xl" variant="heading" weight="bold">
          {byline}
        </Text>
      )}

      {image?.asset?.url && (
        <div className={styles.photo}>
          <Image {...image} sizes="(max-width: 640px) 100vw, 560px" />
        </div>
      )}

      <div className={styles.card}>
        <Text
          as="p"
          className={styles.eyebrow}
          size="2xs"
          text="You're invited"
          textTransform="uppercase"
          variant="mono"
        />
        <Text as="p" className={styles.intro}>
          Enter the guest ID from your invitation email to see the details of the weekend and RSVP.
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

      {summary && (
        <Text as="p" className={styles.summary} size="2xs" text={summary} textTransform="uppercase" variant="mono" />
      )}
    </div>
  );
};

export default GuestEntry;
