/**
 * The RSVP form's contract with the server action that receives it.
 *
 * ## Why this is its own module
 *
 * The server action (`app/(frontend)/rsvp/actions.ts`) has to agree with the form on three things —
 * the name every control submits under, the values a choice can take, and the shape of the state it
 * hands back — and it cannot import them from `./index.tsx`. That file is `'use client'`, and a
 * server module that imports a client module receives client *references*, not values: the arrays
 * below would arrive as opaque proxies and a `.includes()` against them would throw. This module has
 * no directive, so both sides get the real thing.
 *
 * ## The names are the document's
 *
 * Every submitted name is a path in `tools/sanity/schema/documents/rsvp.ts`, including the dotted
 * ones: `plusOne.name` is the `name` field of the `plusOne` object there. So the action maps a
 * `FormData` entry to a document field without a translation table, and a field error keyed by one of
 * these names lands on the control that submitted it.
 */

/**
 * The name each control submits under — and therefore the key it reports errors under.
 *
 * The `FormData` the action receives, field by field:
 *
 *   name, email, dietary, kidsAges, songRequest   one string each, possibly empty
 *   plusOne.bringing     present (value "on") when ticked, **absent** when not — a native checkbox
 *   staying              the same, and ticked by default: present when the guest is staying at the venue
 *   extraNight           the same: present when the guest is staying the Sunday night too — sent
 *                        only while `staying` is ticked
 *   plusOne.name,
 *   plusOne.dietary      present **only** while `plusOne.bringing` is ticked; see `RsvpForm`
 *   kidsCount            a whole number from 0 to `RSVP_KIDS_MAX`, as a string — "0" by default. The
 *                        form checks that before sending; a post made without JavaScript is not
 *                        checked, and there the number input can send "", "-3", "2.5" or "1e1". Parse
 *                        it and range-check it in the action, like every other entry
 *   _gotcha              the honeypot from `Form` — present (value "on") only if something ticked it
 */
export const RSVP_FIELD = {
  dietary: 'dietary',
  email: 'email',
  extraNight: 'extraNight',
  kidsAges: 'kidsAges',
  kidsCount: 'kidsCount',
  name: 'name',
  plusOneBringing: 'plusOne.bringing',
  plusOneDietary: 'plusOne.dietary',
  plusOneName: 'plusOne.name',
  songRequest: 'songRequest',
  specialRequirements: 'specialRequirements',
  staying: 'staying'
} as const;

export type RsvpFieldName = (typeof RSVP_FIELD)[keyof typeof RSVP_FIELD];

/*
 * The form no longer asks which days a guest is coming or which room they would like. Both fields
 * stay on the `rsvp` document so replies sent before the change keep their answers, but nothing here
 * submits them and the action does not read them.
 */

/** The stepper's ceiling. The floor is zero. */
export const RSVP_KIDS_MAX = 10;

/**
 * One message per field, keyed by the name the control submits under.
 *
 * A plain string rather than react-hook-form's `{ type, message }`: the action should not need to
 * know which library draws the form. `RsvpForm` does that conversion on the way in.
 */
export type RsvpFieldErrors = Partial<Record<RsvpFieldName, string>>;

/**
 * Everything the action can hand back, and everything the form can be showing.
 *
 * - `idle` — nothing has been submitted yet. The initial state, and only ever the initial state.
 * - `success` — the reply is stored. Drives the submit button's filled "saved" state, which is the
 *   form's whole confirmation: there is no separate confirmation screen.
 * - `error` — nothing was stored. `fieldErrors` is always present, and empty when the problem is not
 *   any one field's; `message` is the form-level explanation, shown and announced beside the submit
 *   button. An `error` with neither is legal but useless — say what went wrong.
 *
 * "In flight" is not a state here. `useActionState` reports it separately as `isPending`, and the
 * action never observes it.
 */
export type RsvpFormState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; fieldErrors: RsvpFieldErrors; message?: string };

/**
 * The action's signature — the one `useActionState` requires: the previous state, then the form.
 *
 * Expect the same guest more than once. Each call carries their whole reply, and a second one is
 * normal rather than an edge case: the button offers to send again the moment a saved answer is
 * edited, and it stays enabled while a reply is in flight (see `RsvpForm`), so a double press queues
 * a second call behind the first. Store a call as the guest's reply, replacing any earlier one,
 * rather than as one more reply.
 *
 * Takes `FormData` rather than a typed object on purpose. It is the only shape a form without
 * JavaScript can send, and the form posts to this same action when the client bundle has not loaded,
 * so the action sees one shape whichever way the reply arrived. It is also an honest input: a server
 * action is a public endpoint, and every entry has to be validated there whatever the client did.
 */
export type RsvpAction = (previousState: RsvpFormState, formData: FormData) => Promise<RsvpFormState>;

export const RSVP_INITIAL_STATE: RsvpFormState = { status: 'idle' };
