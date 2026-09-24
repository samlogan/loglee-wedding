import { generateKeyPairSync } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A real key, so the JWT is genuinely signed rather than the signer mocked out.
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();

const tokenResponse = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({ json: async () => body, ok: status < 300, status } as unknown as Response);

/** A fresh copy of the module, so its token cache starts empty in each test. */
const load = async () => {
  vi.resetModules();
  return import('./googleAuth');
};

beforeEach(() => {
  vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'guest-sync@example.iam.gserviceaccount.com');
  // As Netlify and .env files store it: newlines as a literal backslash-n.
  vi.stubEnv('GOOGLE_PRIVATE_KEY', PEM.replaceAll('\n', String.raw`\n`));
  vi.stubEnv('GUEST_SHEET_ID', 'sheet-id');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('hasGoogleCredentials', () => {
  it('needs the account, the key and the sheet', async () => {
    const { hasGoogleCredentials } = await load();
    expect(hasGoogleCredentials()).toBe(true);
    vi.stubEnv('GUEST_SHEET_ID', '');
    expect(hasGoogleCredentials()).toBe(false);
  });
});

describe('googleAccessToken', () => {
  it('exchanges a signed service-account JWT for a token, reading the key with escaped newlines', async () => {
    const fetchSpy = tokenResponse(200, { access_token: 'token-1', expires_in: 3600 });
    vi.stubGlobal('fetch', fetchSpy);
    const { default: googleAccessToken } = await load();

    expect(await googleAccessToken()).toBe('token-1');
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    const body = new URLSearchParams(String(init.body));
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    const [, claims] = String(body.get('assertion')).split('.');
    expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toMatchObject({
      aud: 'https://oauth2.googleapis.com/token',
      iss: 'guest-sync@example.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/spreadsheets'
    });
  });

  it('reuses a token until shortly before it expires', async () => {
    const fetchSpy = tokenResponse(200, { access_token: 'token-1', expires_in: 3600 });
    vi.stubGlobal('fetch', fetchSpy);
    const { default: googleAccessToken } = await load();

    await googleAccessToken();
    await googleAccessToken();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('fetches again when the cached token is within a minute of expiring', async () => {
    const fetchSpy = tokenResponse(200, { access_token: 'token-1', expires_in: 30 });
    vi.stubGlobal('fetch', fetchSpy);
    const { default: googleAccessToken } = await load();

    await googleAccessToken();
    await googleAccessToken();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('throws when Google refuses, naming the error', async () => {
    vi.stubGlobal('fetch', tokenResponse(400, { error: 'invalid_grant' }));
    const { default: googleAccessToken } = await load();
    await expect(googleAccessToken()).rejects.toThrow('invalid_grant');
  });

  it('throws without credentials rather than calling Google', async () => {
    vi.stubEnv('GOOGLE_PRIVATE_KEY', '');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { default: googleAccessToken } = await load();
    await expect(googleAccessToken()).rejects.toThrow('GOOGLE_PRIVATE_KEY');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
