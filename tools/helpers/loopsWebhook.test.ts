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

  it('knows the reminder by its workflow name or its subject', () => {
    expect(emailActivityOf(event({ loopName: 'RSVP reminder' }))?.kind).toBe('reminder');
    expect(emailActivityOf(event({ email: { subject: 'A gentle reminder to RSVP' }, loopName: 'Nudge' }))?.kind).toBe(
      'reminder'
    );
  });

  it('reads a click', () => {
    expect(emailActivityOf(event({ eventName: 'email.clicked' }))?.activity).toBe('clicked');
  });

  it('ignores every other event, campaigns, and a contact with no address', () => {
    expect(emailActivityOf(event({ eventName: 'email.delivered' }))).toBeUndefined();
    expect(emailActivityOf(event({ sourceType: 'campaign' }))).toBeUndefined();
    expect(emailActivityOf(event({ contactIdentity: {} }))).toBeUndefined();
    expect(emailActivityOf(null)).toBeUndefined();
  });
});

describe('nextActivityCell', () => {
  const AT = new Date('2026-10-03T00:00:00Z');

  it('writes the first open, and keeps its date on later opens', () => {
    expect(nextActivityCell('', 'opened', AT)).toBe('Opened 3 Oct');
    expect(nextActivityCell('Opened 1 Oct', 'opened', AT)).toBeUndefined();
  });

  it('upgrades an open to a click, and never downgrades a click', () => {
    expect(nextActivityCell('Opened 1 Oct', 'clicked', AT)).toBe('Clicked 3 Oct');
    expect(nextActivityCell('', 'clicked', AT)).toBe('Clicked 3 Oct');
    expect(nextActivityCell('Clicked 2 Oct', 'opened', AT)).toBeUndefined();
    expect(nextActivityCell('Clicked 2 Oct', 'clicked', AT)).toBeUndefined();
  });
});
