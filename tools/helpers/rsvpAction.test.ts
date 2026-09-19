import { stegaClean } from '@sanity/client/stega';
import { describe, expect, it } from 'vitest';

import encodeStega from '@/tools/storybook/encodeStega';

import type { IButtonElement } from '../sanity/schema/elements/button';
import type { ILinkElement } from '../sanity/schema/elements/link';
import resolveRsvpAction from './rsvpAction';
import type { RsvpActionFields } from './rsvpAction';

const RSVP_LINK = {
  linkType: 'internal',
  internalLink: { title: 'RSVP', slug: { current: '/rsvp/' }, pathname: '/rsvp/' }
} as ILinkElement;

const button = (label: string | null): IButtonElement => ({ label, link: RSVP_LINK }) as IButtonElement;

// The field this helper reads the reply-by line from, for the draft-mode cases below.
const RSVP_LABEL = "$['rsvpLabel']";

describe('resolveRsvpAction', () => {
  it('is undefined for the shapes the projections return when nothing is set', () => {
    expect(resolveRsvpAction()).toBeUndefined();
    expect(resolveRsvpAction(null)).toBeUndefined();
    expect(resolveRsvpAction({})).toBeUndefined();
    expect(resolveRsvpAction({ addButton: null, button: null, rsvpLabel: null })).toBeUndefined();
  });

  it('needs the switch on, whatever else is filled in', () => {
    // The editor's "Add RSVP Action" toggle wins: the button survives in the document when it is
    // switched off, because a Sanity `hidden` predicate only hides the field.
    expect(
      resolveRsvpAction({ addButton: false, button: button('RSVP'), rsvpLabel: 'RSVP by 11 December' })
    ).toBeUndefined();
  });

  it('needs a button — a reply-by line alone has nowhere to send anyone', () => {
    expect(resolveRsvpAction({ addButton: true, rsvpLabel: 'RSVP by 11 December' })).toBeUndefined();
  });

  it("reads the action's own label rather than the reply-by line, and passes the link through", () => {
    const fields: RsvpActionFields = { addButton: true, button: button('RSVP'), rsvpLabel: 'RSVP by 11 December' };

    // The date is off the buttons: "RSVP", not "RSVP by 11 December".
    expect(resolveRsvpAction(fields)).toEqual({ label: 'RSVP', link: RSVP_LINK });
    // The same object, not a copy: `Link` is handed exactly what the projection returned.
    expect(resolveRsvpAction(fields)?.link).toBe(RSVP_LINK);
  });

  it.each([null, undefined, '', '   '])('falls back to the action label when the reply-by line is %j', (rsvpLabel) => {
    expect(resolveRsvpAction({ addButton: true, button: button('RSVP'), rsvpLabel })).toMatchObject({ label: 'RSVP' });
  });

  it.each([null, '', '   '])('falls back to the reply-by line when the action label is %j', (label) => {
    expect(
      resolveRsvpAction({ addButton: true, button: button(label), rsvpLabel: 'RSVP by 11 December' })
    ).toMatchObject({ label: 'RSVP by 11 December' });
  });

  it('is undefined when both labels are blank — no empty pill', () => {
    expect(resolveRsvpAction({ addButton: true, button: button(''), rsvpLabel: '   ' })).toBeUndefined();
    expect(resolveRsvpAction({ addButton: true, button: button(null), rsvpLabel: null })).toBeUndefined();
  });

  it.each(['', '   '])('treats a reply-by line of %j as blank once stega has made it non-empty', (blank) => {
    const encoded = encodeStega(blank, RSVP_LABEL);

    // The trap is real: the encoder does not skip a blank value, so the old `rsvpLabel || …` saw text.
    expect(encoded.trim()).not.toBe('');
    expect(stegaClean(encoded)).toBe(blank);

    expect(resolveRsvpAction({ addButton: true, button: button('RSVP'), rsvpLabel: encoded })).toMatchObject({
      label: 'RSVP'
    });
  });

  it('returns an encoded reply-by line as it arrived when it is the fallback, so the overlay can still find its field', () => {
    const encoded = encodeStega('RSVP by 11 December', RSVP_LABEL);

    expect(encoded).not.toBe('RSVP by 11 December');
    expect(resolveRsvpAction({ addButton: true, button: button(''), rsvpLabel: encoded })?.label).toBe(encoded);
  });
});
