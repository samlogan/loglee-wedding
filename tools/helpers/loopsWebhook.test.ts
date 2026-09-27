import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { emailActivityOf, isLoopsSignatureValid, nextActivityCell } from './loopsWebhook';

const KEY = Buffer.from('a-very-secret-key-for-the-tests');
const SECRET = `whsec_${KEY.toString('base64')}`;
const NOW = Date.parse('2026-10-03T00:00:00Z');
const BODY = '{"eventName":"email.opened"}';

const sign = (id: string, timestamp: string, body: string, key = KEY) =>
  `v1,${createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')}`;

const request = (overrides: Partial<Parameters<typeof isLoopsSignatureValid>[0]> = {}) => {
  const timestamp = String(NOW / 1000);
  return {
    body: BODY,
    id: 'msg_1',
    now: NOW,
    secret: SECRET,
    signature: sign('msg_1', timestamp, BODY),
    timestamp,
    ...overrides
  };
};

describe('isLoopsSignatureValid', () => {
  it('accepts a request Loops signed with the secret', () => {
    expect(isLoopsSignatureValid(request())).toBe(true);
  });

  it('accepts it among several signatures, as during a secret rotation', () => {
    const valid = request();
    expect(isLoopsSignatureValid({ ...valid, signature: `v1,bm90IGl0 ${valid.signature}` })).toBe(true);
  });

  it('refuses a body changed after signing, or a different secret', () => {
    expect(isLoopsSignatureValid(request({ body: '{"eventName":"email.clicked"}' }))).toBe(false);
    const timestamp = String(NOW / 1000);
    expect(isLoopsSignatureValid(request({ signature: sign('msg_1', timestamp, BODY, Buffer.from('other')) }))).toBe(
      false
    );
  });

  it('refuses a request more than five minutes old — a replay', () => {
    const timestamp = String(NOW / 1000 - 6 * 60);
    expect(isLoopsSignatureValid(request({ signature: sign('msg_1', timestamp, BODY), timestamp }))).toBe(false);
  });

  it('refuses anything missing, including the secret on the site', () => {
    expect(isLoopsSignatureValid(request({ secret: undefined }))).toBe(false);
    expect(isLoopsSignatureValid(request({ signature: null }))).toBe(false);
    expect(isLoopsSignatureValid(request({ id: null }))).toBe(false);
  });
});

describe('emailActivityOf', () => {
  const event = (overrides: Record<string, unknown>) => ({
    contactIdentity: { email: ' Sam@Example.com ' },
    email: { subject: 'Sam & Lauren are getting married' },
    eventName: 'email.opened',
    loopName: 'Invitation',
    sourceType: 'loop',
    ...overrides
  });

  it('reads an invitation opened, by whom', () => {
    expect(emailActivityOf(event({}))).toEqual({ activity: 'opened', email: 'sam@example.com', kind: 'invitation' });
  });

  it('reads every event the webhook is subscribed to', () => {
    const read = (eventName: string) => emailActivityOf(event({ eventName }))?.activity;
    expect(read('email.delivered')).toBe('delivered');
    expect(read('email.clicked')).toBe('clicked');
    expect(read('email.softBounced')).toBe('softBounced');
    expect(read('email.hardBounced')).toBe('hardBounced');
    expect(read('email.spamReported')).toBe('spamReported');
  });

  it('knows the reminder by its workflow name or its subject', () => {
    expect(emailActivityOf(event({ loopName: 'RSVP reminder' }))?.kind).toBe('reminder');
    expect(emailActivityOf(event({ email: { subject: 'A gentle reminder to RSVP' }, loopName: 'Nudge' }))?.kind).toBe(
      'reminder'
    );
  });

  it('reads a transactional email as the thank-you', () => {
    expect(
      emailActivityOf(event({ eventName: 'email.delivered', loopName: undefined, sourceType: 'transactional' }))
    ).toEqual({ activity: 'delivered', email: 'sam@example.com', kind: 'thankYou' });
  });

  it('ignores unsubscribes and other events, campaigns, and a contact with no address', () => {
    expect(emailActivityOf(event({ eventName: 'email.unsubscribed' }))).toBeUndefined();
    expect(emailActivityOf(event({ sourceType: 'campaign' }))).toBeUndefined();
    expect(emailActivityOf(event({ contactIdentity: {} }))).toBeUndefined();
    expect(emailActivityOf(null)).toBeUndefined();
  });
});

describe('nextActivityCell', () => {
  const AT = new Date('2026-10-03T00:00:00Z');

  it('starts at "Sent", which every event after replaces and nothing replaces back', () => {
    expect(nextActivityCell('', 'sent', AT)).toBe('Sent 3 Oct');
    expect(nextActivityCell('Sent 1 Oct', 'softBounced', AT)).toBe('Soft bounce 3 Oct');
    expect(nextActivityCell('Sent 1 Oct', 'delivered', AT)).toBe('Delivered 3 Oct');
    expect(nextActivityCell('Delivered 1 Oct', 'sent', AT)).toBeUndefined();
    expect(nextActivityCell('Sent 1 Oct', 'sent', AT)).toBeUndefined();
  });

  it('moves forward — delivered, opened, clicked — keeping the first date on a repeat', () => {
    expect(nextActivityCell('', 'delivered', AT)).toBe('Delivered 3 Oct');
    expect(nextActivityCell('Delivered 1 Oct', 'opened', AT)).toBe('Opened 3 Oct');
    expect(nextActivityCell('Opened 1 Oct', 'clicked', AT)).toBe('Clicked 3 Oct');
    expect(nextActivityCell('Opened 1 Oct', 'opened', AT)).toBeUndefined();
  });

  it('never moves back: a late delivery or open does not replace a click', () => {
    expect(nextActivityCell('Clicked 2 Oct', 'opened', AT)).toBeUndefined();
    expect(nextActivityCell('Clicked 2 Oct', 'delivered', AT)).toBeUndefined();
  });

  it('lets a delivery replace a soft bounce, which Loops retries', () => {
    expect(nextActivityCell('', 'softBounced', AT)).toBe('Soft bounce 3 Oct');
    expect(nextActivityCell('Soft bounce 1 Oct', 'delivered', AT)).toBe('Delivered 3 Oct');
  });

  it('keeps a hard bounce and a spam report over everything else', () => {
    expect(nextActivityCell('Delivered 1 Oct', 'hardBounced', AT)).toBe('Bounced 3 Oct');
    expect(nextActivityCell('Bounced 1 Oct', 'delivered', AT)).toBeUndefined();
    expect(nextActivityCell('Clicked 1 Oct', 'spamReported', AT)).toBe('Marked spam 3 Oct');
    expect(nextActivityCell('Marked spam 1 Oct', 'clicked', AT)).toBeUndefined();
  });
});
