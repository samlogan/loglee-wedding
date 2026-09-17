import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import verifyStudioUser from './verifyStudioUser';

const PROJECT_ID = 'test-project';

const request = (headers: Record<string, string> = {}) =>
  new Request('https://example.test/api/sanity/save-image', { headers });

/** A `fetch` stub answering with one status/body, and recording what it was called with. */
const stubFetch = (status: number, body: unknown) => {
  const spy = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) {
        throw new SyntaxError('Unexpected end of JSON input');
      }

      return body;
    }
  } as unknown as Response);

  vi.stubGlobal('fetch', spy);

  return spy;
};

describe('verifyStudioUser', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', PROJECT_ID);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('accepts a real editor token', async () => {
    stubFetch(200, { id: 'pKr2Xy', role: 'administrator', provider: 'google' });

    await expect(verifyStudioUser(request({ authorization: 'Bearer sk-real-token' }))).resolves.toMatchObject({
      id: 'pKr2Xy'
    });
  });

  /*
   * The case this whole helper exists to get right.
   *
   * `/users/me` answers 200 with an empty body when no credentials reach it, so the obvious guard —
   * `if (!res.ok) return null` — accepts every anonymous caller while looking correct. If this test
   * ever starts failing, the guard has been rewritten into one that does nothing.
   */
  it('rejects a 200 with an empty body, which is what Sanity returns for an anonymous call', async () => {
    stubFetch(200, {});

    await expect(verifyStudioUser(request({ authorization: 'Bearer whatever' }))).resolves.toBeNull();
  });

  it('rejects a bogus token', async () => {
    stubFetch(401, { error: 'Unauthorized' });

    await expect(verifyStudioUser(request({ authorization: 'Bearer nonsense' }))).resolves.toBeNull();
  });

  it('rejects read-only roles, so a leaked API read token cannot write', async () => {
    stubFetch(200, { id: 'pKr2Xy', role: 'read' });
    await expect(verifyStudioUser(request({ authorization: 'Bearer sk-read-token' }))).resolves.toBeNull();

    stubFetch(200, { id: 'pKr2Xy', role: 'viewer' });
    await expect(verifyStudioUser(request({ authorization: 'Bearer sk-viewer' }))).resolves.toBeNull();
  });

  it('allows an unrecognised custom role', async () => {
    // A deny list on purpose: a project's custom "editor-in-chief" must not be locked out by a
    // security fix. `id` is what proves membership.
    stubFetch(200, { id: 'pKr2Xy', role: 'content-lead' });

    await expect(verifyStudioUser(request({ authorization: 'Bearer sk-custom' }))).resolves.toMatchObject({
      id: 'pKr2Xy'
    });
  });

  it('fails closed when there is no token, no project id, or no answer', async () => {
    const spy = stubFetch(200, { id: 'pKr2Xy' });

    // No header at all — must not even reach the network.
    await expect(verifyStudioUser(request())).resolves.toBeNull();
    expect(spy).not.toHaveBeenCalled();

    /*
     * A scheme with no token. `Headers` trims the value, so this arrives as the bare string
     * `Bearer` — which an implementation stripping `^Bearer ` leaves intact and forwards to Sanity as
     * if it were a token. Caught here when this helper was first written.
     */
    await expect(verifyStudioUser(request({ authorization: 'Bearer   ' }))).resolves.toBeNull();
    await expect(verifyStudioUser(request({ authorization: 'Bearer' }))).resolves.toBeNull();
    expect(spy).not.toHaveBeenCalled();

    // A token with no scheme is not accepted either — one shape, not two.
    await expect(verifyStudioUser(request({ authorization: 'sk-no-scheme' }))).resolves.toBeNull();

    // Misconfigured server.
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', '');
    await expect(verifyStudioUser(request({ authorization: 'Bearer sk-real' }))).resolves.toBeNull();
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', PROJECT_ID);

    // Sanity unreachable: no answer is not a yes.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(verifyStudioUser(request({ authorization: 'Bearer sk-real' }))).resolves.toBeNull();

    // 200 with a body that is not JSON.
    stubFetch(200, undefined);
    await expect(verifyStudioUser(request({ authorization: 'Bearer sk-real' }))).resolves.toBeNull();
  });

  it('asks the right endpoint, forwards the token, and does not cache the answer', async () => {
    const spy = stubFetch(200, { id: 'pKr2Xy' });

    await verifyStudioUser(request({ authorization: 'bearer sk-lowercase-prefix' }));

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(`https://${PROJECT_ID}.api.sanity.io/v2021-03-25/users/me`);
    // Lowercase `bearer` is accepted and stripped — the header is case-insensitive in practice.
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-lowercase-prefix');
    // A cached "yes" would outlive the token being revoked.
    expect(init.cache).toBe('no-store');
  });
});
