'use client';

import { useActionState, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { set, useFormContext, useWatch } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';

import Button from '@/components/Button';
import Field from '@/components/Field';
import Form from '@/components/Form';
import { preloadDuet } from '@/components/ModelDuet/preload';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import classNames from '@/helpers/classNames';
import { DUET_BACK, DUET_FRONT } from '@/helpers/duetPlacement';
import formatOrdinal from '@/helpers/formatOrdinal';
import type { StayPrice } from '@/helpers/guests';
import type { RsvpPlaceholder } from '@/tools/sanity/schema/documents/weddingSettings';

import { RSVP_FIELD, RSVP_INITIAL_STATE, RSVP_KIDS_MAX } from './contract';
import type { RsvpAction, RsvpFieldErrors, RsvpFormState } from './contract';
import RsvpModel from './RsvpModel';
import type { RsvpModelOption } from './RsvpModel';

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
  /**
   * The players' models. The rail shows the first two walking side by side — see `RsvpModel`.
   * Nothing renders in its place when there are none.
   */
  models?: RsvpModelOption[];
  /** The signed-in guest, from the guest sheet: prefills the form and shows their stay. */
  guest?: RsvpGuest;
  /** The note under the heading, from Wedding Settings — the reply-by date. */
  note?: SanityTextBlock[];
  /** Under the guest's stay and price — how and when they pay. */
  stayNote?: string;
  /** The switch that adds the Sunday night to the guest's stay, and the line under it. */
  extraNightLabel?: string;
  extraNightDescription?: string;
  /** The hint inside each empty answer. Any left out keep the form's own. */
  placeholders?: Partial<Record<RsvpPlaceholder, string>>;
}

/** What the form knows about the guest filling it in. Every field optional: a row can be sparse. */
export interface RsvpGuest {
  name?: string;
  email?: string;
  /** Their room and what it comes to. Absent when the sheet does not give a stay, nights and price. */
  stay?: StayPrice;
}

/** What react-hook-form holds — one key per name in `RSVP_FIELD`, nested where the name is dotted. */
export interface RsvpFormValues {
  dietary: string;
  email: string;
  extraNight: boolean;
  kidsAges: string;
  // A number from the buttons, a string while it is being typed into. Both submit as the same text.
  kidsCount: number | string;
  name: string;
  plusOne: { bringing: boolean; dietary?: string; name?: string };
  songRequest: string;
  specialRequirements: string;
}

const DEFAULT_VALUES: RsvpFormValues = {
  dietary: '',
  email: '',
  extraNight: false,
  kidsAges: '',
  kidsCount: 0,
  name: '',
  plusOne: { bringing: false, dietary: '', name: '' },
  songRequest: '',
  specialRequirements: ''
};

/** "$300", as a guest reads a price — whole dollars, the currency the contribution is set in. */
const formatAud = (amount: number) =>
  new Intl.NumberFormat('en-AU', { currency: 'AUD', maximumFractionDigits: 0, style: 'currency' }).format(amount);

/*
 * The form's own words. Every one can be replaced from Wedding Settings → RSVP → RSVP Form; these are
 * what shows while a field there is blank.
 */
const DEFAULT_COPY = {
  extraNightDescription: 'Add an extra night to your stay and recover in style by the pool.',
  extraNightLabel: 'Spend the Sunday evening with us',
  heading: 'RSVP',
  intro: 'One form per guest.',
  introDetail: "Tell us what you eat, who you're bringing and what you'd like to hear on the dancefloor.",
  stayNote: "You'll see how to pay as soon as you've replied."
};

const DEFAULT_PLACEHOLDERS: Record<RsvpPlaceholder, string> = {
  dietary: 'Allergies, vego, vegan, none…',
  email: 'name@example.com',
  kidsAges: 'e.g. 2 and 5',
  name: 'Full name',
  plusOneDietary: 'Allergies, vego, vegan, none…',
  plusOneName: 'Their full name',
  songRequest: 'One song that gets you on the floor',
  specialRequirements: 'Anything we should know? e.g. a cot for the baby'
};

/**
 * The stay as the guest has it right now: the Sunday night added — one more night at the same price —
 * while the switch is on. The page passes the stay from the sheet, without it.
 */
const withExtraNight = (stay: StayPrice, extraNight: boolean): StayPrice =>
  extraNight
    ? { ...stay, extraNight, nights: stay.nights + 1, total: stay.total + stay.perNight }
    : { ...stay, extraNight };

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
 * The RSVP page: a rail holding the heading, the intro and one of the couple's 3D characters,
 * beside the numbered questions and the submit button.
 *
 * ## Why one component and not two sections
 *
 * The rail is sticky against the questions' scroll, so the two halves share one layout; the page is
 * a route rather than a page-builder document for the reason `app/(frontend)/rsvp/page.tsx` gives.
 *
 * ## The submit path
 *
 * `useActionState` owns the result; `Form` owns validation. A submit runs react-hook-form's
 * validation first — a convenience, never the gate — and only a valid form is serialised from the
 * `<form>` element and dispatched to the action inside a transition. The state that comes back
 * drives everything after: field errors are handed to react-hook-form through `Form`'s `errors`, so
 * they render and clear exactly like client errors. A success never comes back to the form in the
 * app: the action redirects to the thank-you page. The button's "saved" state remains for the moment
 * before the navigation lands, and for the stories, which drive the form with a mock action.
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
    introDetail = DEFAULT_COPY.introDetail,
    stayNote = DEFAULT_COPY.stayNote,
    extraNightLabel = DEFAULT_COPY.extraNightLabel,
    extraNightDescription = DEFAULT_COPY.extraNightDescription,
    guest,
    models,
    note
  } = props;
  const placeholders = { ...DEFAULT_PLACEHOLDERS, ...props.placeholders };

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
      defaultValues={{ ...DEFAULT_VALUES, email: guest?.email ?? '', name: guest?.name ?? '' }}
      errors={serverErrors}
      layout="normal"
      onSubmit={(values) => setSentValues(JSON.stringify(values))}
      submitButton={{ hide: true }}
      theme="underline"
    >
      <RsvpFormBody
        extraNightDescription={extraNightDescription}
        extraNightLabel={extraNightLabel}
        heading={heading}
        intro={intro}
        introDetail={introDetail}
        isPending={isPending}
        models={models}
        note={note}
        placeholders={placeholders}
        sentValues={sentValues}
        state={state}
        stay={guest?.stay}
        stayNote={stayNote}
      />
    </Form>
  );
};

interface RsvpFormBodyProps {
  extraNightDescription: string;
  extraNightLabel: string;
  heading: string;
  intro: string;
  introDetail?: string;
  isPending: boolean;
  models?: RsvpModelOption[];
  note?: SanityTextBlock[];
  placeholders: Record<RsvpPlaceholder, string>;
  sentValues: string | null;
  stay?: StayPrice;
  stayNote: string;
  state: RsvpFormState;
}

/** Everything inside the react-hook-form context — which is why it is a component of its own. */
const RsvpFormBody = (props: RsvpFormBodyProps) => {
  const {
    extraNightDescription,
    extraNightLabel,
    heading,
    intro,
    introDetail,
    isPending,
    models,
    note,
    placeholders,
    sentValues,
    state,
    stayNote
  } = props;

  const { control, resetField } = useFormContext<RsvpFormValues>();
  const values = useWatch({ control });

  const bringing = Boolean(values.plusOne?.bringing);
  const stay = props.stay && withExtraNight(props.stay, Boolean(values.extraNight));

  /*
   * "Spend the Sunday evening with us". In the stay card when the guest has one, beside the price it
   * changes; a numbered question like the rest when they do not, so it is asked either way.
   */
  const extraNightSwitch = (label: ReactNode) => (
    <div className={styles.extraNight}>
      <Field.Toggle checkedText="Yes" label={label} name={RSVP_FIELD.extraNight} uncheckedText="No" />
      <Text as="p" className={styles.extraNightDescription} size="sm" text={extraNightDescription} />
    </div>
  );
  const isSaved = state.status === 'success' && !isPending && sentValues === JSON.stringify(values);

  /*
   * A saved reply sends the guest to the thank-you page, where the two of them dance — two
   * multi-megabyte models. Warmed the first time the guest starts filling the form in, so the pair is
   * on stage when they land rather than a placeholder for several seconds. An event handler rather
   * than an effect: the guest engaging with the form is the cause. Once per visit.
   */
  const warmed = useRef(false);
  const warmThankYou = () => {
    if (!warmed.current) {
      warmed.current = true;
      preloadDuet([DUET_BACK.src, DUET_FRONT.src]);
    }
  };

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
          placeholder={placeholders.name}
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
          placeholder={placeholders.email}
          required
          validate={(value) => EMAIL_PATTERN.test(value.trim()) || 'Enter an email address, like name@example.com'}
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
          placeholder={placeholders.dietary}
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
                placeholder={placeholders.plusOneName}
                required
                validate={(value) => isFilled(value) || "Enter your plus one's name"}
              />
              <Field.Text
                label="Plus one dietary requirements"
                name={RSVP_FIELD.plusOneDietary}
                placeholder={placeholders.plusOneDietary}
              />
            </>
          )}
        </div>
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
              placeholder={placeholders.kidsAges}
            />
          </div>
        </div>
      )
    },
    ...(stay
      ? []
      : [
          {
            key: 'extraNight',
            render: (label: (title: ReactNode) => ReactNode) => extraNightSwitch(label(extraNightLabel))
          }
        ]),
    {
      key: 'specialRequirements',
      render: (label) => (
        <Field.TextArea
          label={label('Special requirements')}
          name={RSVP_FIELD.specialRequirements}
          placeholder={placeholders.specialRequirements}
        />
      )
    },
    {
      key: 'songRequest',
      render: (label) => (
        <Field.Text
          label={label('Song request')}
          name={RSVP_FIELD.songRequest}
          placeholder={placeholders.songRequest}
        />
      )
    }
  ];

  return (
    <div className={styles.rsvp} onFocusCapture={warmThankYou}>
      <div className={styles.layout}>
        <div className={styles.rail}>
          <Text as="h1" className={styles.heading} size="md" text={heading} variant="display" />
          {note && note.length > 0 && <TextBlock blocks={note} className={styles.note} />}
          <Text as="p" size="lg">
            {intro}
            {introDetail && <span className={styles.wideOnly}> {introDetail}</span>}
          </Text>
          {models && models.length > 0 && <RsvpModel models={models} />}
        </div>

        <div className={styles.fields}>
          {stay && (
            <section aria-labelledby="rsvp-stay" className={styles.stay}>
              <Text
                as="h2"
                className={styles.stayLabel}
                id="rsvp-stay"
                size="2xs"
                text="Your stay"
                textTransform="uppercase"
                variant="mono"
              />
              <Text as="p" size="lg" weight="medium">
                {stay.stay} · {stay.nights} {stay.nights === 1 ? 'night' : 'nights'}
                {stay.extraNight && ', Sunday included'}
              </Text>
              {/* Polite and atomic, so switching the Sunday night on or off is heard as the new total. */}
              <div aria-atomic="true" aria-live="polite">
                <Text as="p" className={styles.stayPrice}>
                  {formatAud(stay.perNight)} per room, per night · <strong>{formatAud(stay.total)}</strong> in total
                </Text>
              </div>
              {extraNightSwitch(extraNightLabel)}
              <Text as="p" className={styles.stayNote} size="sm" text={stayNote} />
            </section>
          )}
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

export default RsvpForm;
