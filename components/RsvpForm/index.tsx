'use client';

import { Fragment, useActionState, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { set, useFormContext, useWatch } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';

import Button from '@/components/Button';
import Field from '@/components/Field';
import Form from '@/components/Form';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import formatOrdinal from '@/helpers/formatOrdinal';

import { RSVP_DAYS, RSVP_FIELD, RSVP_INITIAL_STATE, RSVP_KIDS_MAX, RSVP_ROOM_PREFERENCES } from './contract';
import type { RsvpAction, RsvpFieldErrors, RsvpFormState } from './contract';

import styles from './styles.module.scss';

export type { RsvpAction, RsvpFieldErrors, RsvpFieldName, RsvpFormState } from './contract';

export interface RsvpFormProps {
  /**
   * The server action — `submitRsvp` from `app/(frontend)/rsvp/actions.ts` on the page, a mock in
   * stories. Taken as a prop so the form never imports the server, and can be exercised against any
   * `RsvpFormState` without one.
   */
  action: RsvpAction;
  className?: string;
  heading?: string;
  /** The first sentence of the intro. Shown at every width. */
  intro?: string;
  /** The rest of it. Wide layouts only — the phone frame keeps just `intro` (Figma node 1:884). */
  introDetail?: string;
}

/** What react-hook-form holds — one key per name in `RSVP_FIELD`, nested where the name is dotted. */
export interface RsvpFormValues {
  attending: string[];
  dietary: string;
  email: string;
  kidsAges: string;
  // A number from the buttons, a string while it is being typed into. Both submit as the same text.
  kidsCount: number | string;
  name: string;
  plusOne: { bringing: boolean; dietary?: string; name?: string };
  roomPreference: string;
  songRequest: string;
}

const DEFAULT_VALUES: RsvpFormValues = {
  attending: [],
  dietary: '',
  email: '',
  kidsAges: '',
  kidsCount: 0,
  name: '',
  plusOne: { bringing: false, dietary: '', name: '' },
  roomPreference: '',
  songRequest: ''
};

const DEFAULT_COPY = {
  heading: 'RSVP',
  intro: 'One form per guest.',
  introDetail:
    "Tell us which days you'll join, what you eat, where you'd like to sleep and what you'd like to hear on the dancefloor."
};

// Deliberately loose — `name@domain.tld` with no spaces. The server is the gate; this only catches a
// typo before the round trip.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Filled in with something other than spaces. */
const isFilled = (value: string) => value.trim() !== '';

/**
 * A count the stepper could have produced — digits only, and no more than its ceiling.
 *
 * The stepper settles a typed value when the input loses focus, but Enter submits from inside it,
 * and a number input will then send "-3", "2.5", "1e1" or nothing at all. Checked as text rather
 * than through `Number`, which reads "" as 0 and "1e1" as 10 — values that would pass here and
 * still reach the action in a shape `contract.ts` does not promise. The value is a number when the
 * buttons set it and a string when it was typed; `String` reads both.
 */
const isKidsCount = (value: unknown) => /^\d+$/.test(String(value ?? '')) && Number(value) <= RSVP_KIDS_MAX;

/**
 * The action's flat `{ 'plusOne.name': message }` into the nested shape react-hook-form keys its
 * errors by. `set` is react-hook-form's own path writer, so a dotted name nests exactly the way a
 * client-side error for the same field would.
 */
const toFieldErrors = (fieldErrors: RsvpFieldErrors): FieldErrors => {
  const errors: FieldErrors = {};
  for (const [name, message] of Object.entries(fieldErrors)) {
    if (message) {
      set(errors, name, { message, type: 'server' });
    }
  }
  return errors;
};

/**
 * "01 · Name" — the ordinal is decoration and hidden, so the control's accessible name is "Name".
 *
 * `formatOrdinal` takes the **zero-based** index, straight from `map`; see its contract.
 */
const numbered = (index: number, title: ReactNode): ReactNode => (
  <>
    <span aria-hidden="true">{formatOrdinal(index)} · </span>
    {title}
  </>
);

/**
 * The RSVP page: a rail holding the heading, the intro and a live summary, beside the numbered
 * questions and the submit button.
 *
 * ## Why one component and not two sections
 *
 * The rail is sticky against the questions' scroll, and its summary mirrors the form's live state.
 * Both need the two halves inside one react-hook-form context, so the heading cannot be a separate
 * page-builder section.
 *
 * ## The submit path
 *
 * `useActionState` owns the result; `Form` owns validation. A submit runs react-hook-form's
 * validation first — a convenience, never the gate — and only a valid form is serialised from the
 * `<form>` element and dispatched to the action inside a transition. The state that comes back
 * drives everything after: field errors are handed to react-hook-form through `Form`'s `errors`, so
 * they render and clear exactly like client errors, and a success fills the submit button with its
 * "saved" state, which is the whole confirmation.
 *
 * ## How an error reaches a screen reader
 *
 * Client or server, a field's error takes one path. react-hook-form moves focus to the first invalid
 * field — `Form`'s `errors` triggers the same focus a failed client validation does — and the field
 * renders `aria-invalid`, described by its message. The message itself is *spoken* as it appears, by
 * the field's `FieldError`, which is a live region.
 *
 * That last part is the one doing the work at the moment of failure, and it is worth knowing why.
 * react-hook-form focuses the field a render *before* `aria-invalid` and the description land —
 * measured: the focus event fires with neither attribute set — so the focus announcement itself says
 * nothing about an error. The live region does. `aria-invalid` and the description are for every
 * later visit to the field. A reply refused as a whole also says so, in words, from the alert beside
 * the submit button.
 */
const RsvpForm = (props: RsvpFormProps) => {
  const {
    action,
    className,
    heading = DEFAULT_COPY.heading,
    intro = DEFAULT_COPY.intro,
    introDetail = DEFAULT_COPY.introDetail
  } = props;

  const [state, formAction, isPending] = useActionState(action, RSVP_INITIAL_STATE);

  /*
   * The values as they were when last sent, serialised. "Saved" is only true while the form still
   * says what was saved — change an answer afterwards and the button offers to send again, rather
   * than claiming the edit is stored.
   */
  const [sentValues, setSentValues] = useState<string | null>(null);

  const serverErrors = useMemo(
    () => (state.status === 'error' ? toFieldErrors(state.fieldErrors) : undefined),
    [state]
  );

  return (
    <Form
      action={formAction}
      className={classNames(styles.form, className)}
      // Spread, because `Form` types its defaults as `Record<string, unknown>` and an interface carries
      // no index signature; the copy is also what react-hook-form is free to mutate.
      defaultValues={{ ...DEFAULT_VALUES }}
      errors={serverErrors}
      layout="normal"
      onSubmit={(values) => setSentValues(JSON.stringify(values))}
      submitButton={{ hide: true }}
      theme="underline"
    >
      <RsvpFormBody
        heading={heading}
        intro={intro}
        introDetail={introDetail}
        isPending={isPending}
        sentValues={sentValues}
        state={state}
      />
    </Form>
  );
};

interface RsvpFormBodyProps {
  heading: string;
  intro: string;
  introDetail?: string;
  isPending: boolean;
  sentValues: string | null;
  state: RsvpFormState;
}

/** Everything inside the react-hook-form context — which is why it is a component of its own. */
const RsvpFormBody = (props: RsvpFormBodyProps) => {
  const { heading, intro, introDetail, isPending, sentValues, state } = props;

  const { control, resetField } = useFormContext<RsvpFormValues>();
  const values = useWatch({ control });

  const bringing = Boolean(values.plusOne?.bringing);
  const isSaved = state.status === 'success' && !isPending && sentValues === JSON.stringify(values);

  /*
   * Turning the plus one off clears their answers, not just hides them.
   *
   * Hiding alone is not enough, and not only for tidiness: react-hook-form keeps an unmounted field's
   * value, so a name typed, switched off and switched back on would reappear — and a stale plus-one
   * name is exactly the reply nobody meant to send. The fields unmount as well, so they are absent
   * from the `FormData` either way; resetting them here is what makes switching back on start blank.
   * An event handler rather than an effect, because the switch is the cause.
   */
  const onPlusOneChange = ({ checked }: { checked: boolean }) => {
    if (!checked) {
      resetField(RSVP_FIELD.plusOneName, { defaultValue: '' });
      resetField(RSVP_FIELD.plusOneDietary, { defaultValue: '' });
    }
  };

  const fieldErrorCount = state.status === 'error' ? Object.values(state.fieldErrors).filter(Boolean).length : 0;
  const alertMessage =
    state.status === 'error' && !isPending
      ? [
          state.message ?? "Your reply hasn't been sent.",
          fieldErrorCount > 0 &&
            (fieldErrorCount === 1
              ? 'Check the answer marked above.'
              : `Check the ${fieldErrorCount} answers marked above.`)
        ]
          .filter(Boolean)
          .join(' ')
      : '';

  let statusMessage = '';
  if (isPending) {
    statusMessage = 'Sending your reply…';
  } else if (isSaved) {
    statusMessage = 'Saved. Thank you, your reply is in.';
  }

  /*
   * The questions, in order. The numbers are *derived* from this order — `formatOrdinal(index)` in
   * the map below — so adding, removing or moving one renumbers everything after it, and the page
   * can never show two "04"s or skip one.
   */
  const questions: { key: string; render: (label: (title: ReactNode) => ReactNode) => ReactNode }[] = [
    {
      key: 'name',
      render: (label) => (
        <Field.Text
          className={styles.nameField}
          label={label('Name')}
          name={RSVP_FIELD.name}
          placeholder="Full name"
          required
          validate={(value) => isFilled(value) || 'Enter your name'}
        />
      )
    },
    {
      key: 'email',
      render: (label) => (
        <Field.Email
          label={label('Email')}
          name={RSVP_FIELD.email}
          placeholder="name@example.com"
          required
          validate={(value) => EMAIL_PATTERN.test(value.trim()) || 'Enter an email address, like name@example.com'}
        />
      )
    },
    {
      key: 'attending',
      render: (label) => (
        <Field.Checkbox
          label={label('Attending')}
          name={RSVP_FIELD.attending}
          options={RSVP_DAYS.map(({ eyebrow, label: title, value }) => ({ eyebrow, label: title, value }))}
        />
      )
    },
    {
      key: 'dietary',
      render: (label) => (
        <Field.Text
          /*
           * "Dietary" alone on the phone frame (Figma node 1:921), like the ages gloss below. The space
           * sits outside the span: testing-library computes a name per element and trims each one, so
           * a leading space inside it named the field "Dietaryrequirements" in every story.
           */
          label={label(
            <>
              Dietary <span className={styles.wideOnly}>requirements</span>
            </>
          )}
          name={RSVP_FIELD.dietary}
          placeholder="Allergies, vego, vegan, none…"
        />
      )
    },
    {
      key: 'plusOne',
      render: (label) => (
        <div className={styles.group}>
          <Field.Toggle
            checkedText="Yes"
            label={label('Bringing a plus one?')}
            name={RSVP_FIELD.plusOneBringing}
            onChange={onPlusOneChange}
            uncheckedText="No"
          />
          {bringing && (
            <>
              <Field.Text
                label="Plus one name"
                name={RSVP_FIELD.plusOneName}
                placeholder="Their full name"
                required
                validate={(value) => isFilled(value) || "Enter your plus one's name"}
              />
              <Field.Text
                label="Plus one dietary requirements"
                name={RSVP_FIELD.plusOneDietary}
                placeholder="Allergies, vego, vegan, none…"
              />
            </>
          )}
        </div>
      )
    },
    {
      key: 'roomPreference',
      render: (label) => (
        <Field.Radio
          label={label('Room preference')}
          name={RSVP_FIELD.roomPreference}
          options={RSVP_ROOM_PREFERENCES.map((room) => ({ label: room, value: room }))}
          variant="pill"
        />
      )
    },
    {
      key: 'kids',
      render: (label) => (
        /*
         * Two up at every width, the phone frame included (Figma node 1:941). Each field sits in a
         * wrapper of its own because `FieldContainer` carries an unlayered `grid-column: 1 / span 2`
         * for `Form`'s grid layout, which would span both of these tracks from here.
         */
        <div className={styles.kids}>
          <div className={styles.kidsCount}>
            <Field.Number
              decrementLabel="Remove a child"
              incrementLabel="Add a child"
              label={label('Kids')}
              max={RSVP_KIDS_MAX}
              min={0}
              name={RSVP_FIELD.kidsCount}
              validate={(value) => isKidsCount(value) || `Enter a number from 0 to ${RSVP_KIDS_MAX}`}
            />
          </div>
          <div className={styles.kidsAges}>
            <Field.Text
              label={
                <>
                  Ages<span className={styles.wideOnly}> (for nanny planning)</span>
                </>
              }
              name={RSVP_FIELD.kidsAges}
              placeholder="e.g. 2 and 5"
            />
          </div>
        </div>
      )
    },
    {
      key: 'songRequest',
      render: (label) => (
        <Field.Text
          label={label('Song request')}
          name={RSVP_FIELD.songRequest}
          placeholder="One song that gets you on the floor"
        />
      )
    }
  ];

  return (
    <div className={styles.rsvp}>
      <div className={styles.layout}>
        <div className={styles.rail}>
          <Text as="h1" className={styles.heading} size="md" text={heading} variant="display" />
          <Text as="p" size="lg">
            {intro}
            {introDetail && <span className={styles.wideOnly}> {introDetail}</span>}
          </Text>
          <RsvpSummary attending={values.attending} kidsCount={values.kidsCount} />
        </div>

        <div className={styles.fields}>
          {questions.map(({ key, render }, index) => (
            <div className={styles.question} key={key}>
              {render((title) => numbered(index, title))}
            </div>
          ))}

          <div className={styles.actions}>
            {/*
             * Two regions, both always in the DOM so a change to either is announced — a live region
             * inserted along with its content is announced unreliably or not at all.
             *
             * The alert is visible and assertive: a reply that was not sent is the one thing here the
             * reader must not miss, and it has to be readable without relying on its red rule. The
             * status is polite and visually hidden, because what it says is already on the button.
             */}
            <div className={styles.alert} role="alert">
              {alertMessage && <Text as="p" text={alertMessage} />}
            </div>
            <p className={styles.visuallyHidden} role="status">
              {statusMessage}
            </p>

            {/*
             * The accent is reserved for the RSVP action, so the button keeps it — with a plain label.
             * Saved, it takes the design's filled "saved" state (Figma node 1:1113): the primary pair,
             * and a tick and a word, so the change is not carried by colour alone.
             *
             * Never `disabled` while pending. A focused button that disables drops focus to `<body>`,
             * and a keyboard user who has just pressed it would be thrown out of the form.
             */}
            <Button
              className={styles.submit}
              size="lg"
              theme={isSaved ? 'primary' : 'accent'}
              type="submit"
              variant="rounded"
            >
              {isSaved && <span aria-hidden="true">✓</span>}
              {isSaved ? 'Saved' : isPending ? 'Sending…' : 'Send RSVP'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RsvpSummaryProps {
  attending?: string[];
  kidsCount?: number | string;
}

/**
 * The rail's live summary — the day selections and the kids count, mirrored from the form as it is
 * filled in. Wide layouts only.
 *
 * Deliberately not a live region. Every change it shows is one the reader has just made on a control
 * that announced it; saying it again from here would be the same fact twice.
 */
const RsvpSummary = (props: RsvpSummaryProps) => {
  const { attending = [], kidsCount } = props;
  const headingId = useId();
  const kids = Number.parseInt(String(kidsCount ?? 0), 10);

  return (
    <section aria-labelledby={headingId} className={styles.summary}>
      <Text
        as="h2"
        className={styles.summaryTitle}
        id={headingId}
        size="xs"
        text="Your reply"
        textTransform="uppercase"
        variant="mono"
        weight="bold"
      />
      <dl className={styles.summaryList}>
        {RSVP_DAYS.map((day) => (
          <Fragment key={day.value}>
            <Text as="dt" size="xs" text={day.short} textTransform="uppercase" variant="mono" weight="regular" />
            <Text
              as="dd"
              size="xs"
              text={attending.includes(day.value) ? 'In' : 'Out'}
              textTransform="uppercase"
              variant="mono"
              weight="regular"
            />
          </Fragment>
        ))}
        <Text as="dt" size="xs" text="Kids" textTransform="uppercase" variant="mono" weight="regular" />
        <Text
          as="dd"
          size="xs"
          text={Number.isFinite(kids) ? kids : 0}
          textTransform="uppercase"
          variant="mono"
          weight="regular"
        />
      </dl>
    </section>
  );
};

export default RsvpForm;
