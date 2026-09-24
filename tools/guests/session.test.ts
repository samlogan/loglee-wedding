import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Guest } from '@/helpers/guests';
import { GUEST_COOKIE, signGuestSession } from '@/helpers/guestSession';

const jar = vi.hoisted(() => ({ set: vi.fn(), value: undefined as string | undefined }));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (jar.value ? { value: jar.value } : undefined), set: jar.set })
}));

vi.mock('./sheet', () => ({
  findGuest: vi.fn(async (id: string) =>
    id === 'SAM-4821' ? ({ firstName: 'Sam', id: 'SAM-4821' } as Guest) : undefined
  )
}));

const { COUPLE_ID, currentGuest, isCouplePassword, signIn } = await import('./session');

beforeEach(() => {
  jar.set.mockClear();
  jar.value = undefined;
  vi.stubEnv('GUEST_SESSION_SECRET', 'secret');
  vi.stubEnv('COUPLE_PASSWORD', 'pig');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isCouplePassword', () => {
  it('matches the password in any case, with spaces around it', () => {
    expect(isCouplePassword('pig')).toBe(true);
    expect(isCouplePassword(' PIG ')).toBe(true);
    expect(isCouplePassword('pigs')).toBe(false);
  });

  it('never matches when no password is set — a blank can never open the site', () => {
    vi.stubEnv('COUPLE_PASSWORD', '');
    expect(isCouplePassword('')).toBe(false);
    expect(isCouplePassword('pig')).toBe(false);
  });
});

describe('signIn', () => {
  it('sets a signed, HttpOnly, site-wide cookie for the guest', async () => {
    await signIn({ id: 'SAM-4821' });
    const [name, value, options] = jar.set.mock.calls[0];
    expect(name).toBe(GUEST_COOKIE);
    expect(value).toBe(signGuestSession('SAM-4821', 'secret'));
    expect(options).toMatchObject({ httpOnly: true, path: '/', sameSite: 'lax' });
  });

  it('signs the couple in as COUPLE', async () => {
    await signIn({ id: COUPLE_ID });
    expect(jar.set.mock.calls[0][1]).toBe(signGuestSession('COUPLE', 'secret'));
  });

  it('refuses without a signing secret, so nobody is let in unsigned', async () => {
    vi.stubEnv('GUEST_SESSION_SECRET', '');
    await expect(signIn({ id: 'SAM-4821' })).rejects.toThrow('GUEST_SESSION_SECRET');
    expect(jar.set).not.toHaveBeenCalled();
  });
});

describe('currentGuest', () => {
  it('is the guest in a validly signed cookie', async () => {
    jar.value = signGuestSession('SAM-4821', 'secret');
    expect((await currentGuest())?.firstName).toBe('Sam');
  });

  it('is nobody for a missing, forged or unknown cookie', async () => {
    expect(await currentGuest()).toBeUndefined();
    jar.value = 'SAM-4821.forged';
    expect(await currentGuest()).toBeUndefined();
    jar.value = signGuestSession('NOBODY-0000', 'secret');
    expect(await currentGuest()).toBeUndefined();
  });

  it('is nobody — not a sheet row — for the couple', async () => {
    jar.value = signGuestSession(COUPLE_ID, 'secret');
    expect(await currentGuest()).toBeUndefined();
  });
});
