/**
 * Reads the signed-in Studio user's Sanity token, for calls from Studio components to our own API
 * routes.
 *
 * Studio v5 defaults to `loginMethod: 'dual'` and stores the token in `localStorage` under
 * `__studio_auth_token_<projectId>`, as `{ token: '...' }`. That is what Studio's own internal
 * `getStoredToken` reads — verified against the installed `sanity` package rather than taken from
 * documentation, because it is not part of the public API. It is also the reason this is the only
 * place in the codebase that knows the key: when Studio changes it, one file breaks.
 *
 * Two things this is not:
 *
 * It is not a grant. Routes receiving this token verify it against Sanity before acting on it (see
 * `verifyStudioUser`), and still perform the write with the server's own credentials. Sending a
 * token here gets you nothing that Sanity would not already let you do.
 *
 * It is not available under `loginMethod: 'cookie'`. A project configuring that gets no token in
 * storage, so these calls will 401 and the affected Studio buttons stop working. That is a visible,
 * reportable failure rather than a silent one, which is the right way round.
 */

const STORAGE_PREFIX = '__studio_auth_token_';

export const getStudioAuthToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;

  if (!projectId) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);

    if (!raw) {
      return null;
    }

    const token = JSON.parse(raw)?.token;

    return typeof token === 'string' && token ? token : null;
  } catch {
    /*
     * Private-mode storage restrictions, or a shape change in Studio's storage.
     *
     * Note that Studio falls back to an in-memory store when `localStorage` is unavailable, so in
     * that case it stays logged in while this returns `null`. The result is a 401 and a failed
     * button, not a broken session.
     */
    return null;
  }
};

/** `Authorization` header for our API routes, or `{}` when there is no token to send. */
export const studioAuthHeader = (): Record<string, string> => {
  const token = getStudioAuthToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
};
