import 'server-only';
import { createSign } from 'node:crypto';

/**
 * An access token for the guest sheet, as the service account in `GOOGLE_SERVICE_ACCOUNT_EMAIL` /
 * `GOOGLE_PRIVATE_KEY`.
 *
 * The OAuth 2.0 service-account flow by hand — sign a JWT with the account's key, exchange it for a
 * token — rather than `googleapis`, which is a large dependency for two HTTP calls. Tokens last an
 * hour; this one is reused until a minute before it expires.
 */
let cached: { token: string; expiresAt: number } | undefined;

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

export const hasGoogleCredentials = () =>
  Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GUEST_SHEET_ID);

const googleAccessToken = async (): Promise<string> => {
  if (cached && cached.expiresAt - 60_000 > Date.now()) {
    return cached.token;
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Netlify and `.env` files both tend to store the key's newlines as a literal `\n`.
  const key = process.env.GOOGLE_PRIVATE_KEY?.replaceAll(String.raw`\n`, '\n');
  if (!email || !key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY must be set');
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url({ alg: 'RS256', typ: 'JWT' })}.${base64url({
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets'
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key).toString('base64url');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    body: new URLSearchParams({
      assertion: `${unsigned}.${signature}`,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer'
    }),
    cache: 'no-store',
    method: 'POST'
  });
  const body = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(`Google token request failed: ${body.error ?? response.status}`);
  }
  cached = { expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000, token: body.access_token };
  return cached.token;
};

export default googleAccessToken;
