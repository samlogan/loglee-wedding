import 'server-only';

/**
 * Confirms a request came from a signed-in Sanity Studio user.
 *
 * The routes that need this are called from the browser by Studio components, so there is no shared
 * secret to check: anything the Studio knows, an attacker reading the bundle knows too. A
 * `NEXT_PUBLIC_` secret is not a secret, and a server-only one cannot be sent by browser code — that
 * second point is not hypothetical here, it is why `save-image` returned 401 to its own caller until
 * this replaced the webhook-secret guard.
 *
 * What the Studio *does* hold is the editor's own auth token, and only Sanity can say whether a token
 * is real. So the caller forwards it and we ask Sanity. The token is never trusted on its face and is
 * never used to perform the write — the route still writes with the server's own token, so a caller
 * cannot escalate beyond what the route already allows.
 *
 * A CSRF token would not substitute for this. Double-submit cookies prove the request came from your
 * own origin, not that the person behind it is allowed to write.
 */

/**
 * Pinned rather than following `NEXT_PUBLIC_SANITY_API_VERSION`.
 *
 * That variable tracks the content API version a project wants for its queries and is expected to
 * move. This call is an authentication check against a stable endpoint, and it should not start
 * failing — or worse, start returning a differently shaped body — because someone bumped the content
 * API for an unrelated reason.
 */
const API_VERSION = '2021-03-25';

/** Long enough for a normal round trip, short enough that an unresponsive Sanity is not our outage. */
const AUTH_TIMEOUT_MS = 5000;

interface StudioUser {
  id: string;
  role?: string;
  provider?: string;
}

/**
 * Roles that must not trigger a write.
 *
 * Deliberately a deny list rather than an allow list. Projects define their own custom roles, and an
 * allow list would reject a legitimate editor whose role simply is not on it — turning a security fix
 * into an outage on someone else's project, which is the kind of change a boilerplate must not ship.
 *
 * The load-bearing check remains `id`, which proves the caller is a member of this project at all.
 * This only strips the roles known to be read-only. `read` is what an API read token reports, so a
 * leaked `SANITY_API_READ_TOKEN` cannot drive these routes.
 */
const READ_ONLY_ROLES = new Set(['viewer', 'read']);

const verifyStudioUser = async (request: Request): Promise<StudioUser | null> => {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;

  if (!projectId) {
    return null;
  }

  /*
   * Parsed with a capture rather than `.replace(/^Bearer /i, '')`.
   *
   * `Headers` trims the value, so the header `Bearer   ` arrives as the bare string `Bearer`. A
   * replace of `^Bearer ` — with its trailing space — then does not match, leaving the literal word
   * `Bearer` as the "token" and sending it to Sanity. Fail-closed still held, because Sanity rejects
   * it, but the check should not need a round trip to notice a header with no token in it.
   *
   * The scheme is required. Our own caller always sends `Bearer <token>`, and accepting a bare token
   * as well would mean two shapes to reason about for no gain.
   */
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  const token = /^Bearer\s+(\S.*)$/i.exec(authorization)?.[1]?.trim();

  if (!token) {
    return null;
  }

  let res: Response;

  try {
    res = await fetch(`https://${projectId}.api.sanity.io/v${API_VERSION}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      /*
       * Node's `fetch` has no default timeout, and this call sits in front of every request to the
       * route. A Sanity outage that accepts connections but never answers would otherwise hold each
       * request open until the platform killed it, so slow upstream becomes exhausted capacity here.
       * Aborting trips the `catch` below, which already fails closed.
       */
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS)
    });
  } catch {
    // No answer, or too slow to wait for. Fail closed: neither is the same as a yes.
    return null;
  }

  if (!res.ok) {
    return null;
  }

  /**
   * The `id` check is the load-bearing one, not `res.ok`.
   *
   * This endpoint answers **200 with an empty body** when no credentials are sent, and reserves 401
   * for a malformed token. A guard written the obvious way — `if (!res.ok) return null` — would
   * therefore wave through every anonymous caller while reading as correct, which is a worse outcome
   * than having no guard at all, because it looks like there is one.
   *
   * Anything replacing this must keep asserting on the body. `verifyStudioUser.test.ts` covers the
   * empty-200 case specifically.
   */
  let user: StudioUser | null = null;

  try {
    user = (await res.json()) as StudioUser;
  } catch {
    return null;
  }

  if (!user?.id) {
    return null;
  }

  if (user.role && READ_ONLY_ROLES.has(user.role)) {
    return null;
  }

  return user;
};

export default verifyStudioUser;
