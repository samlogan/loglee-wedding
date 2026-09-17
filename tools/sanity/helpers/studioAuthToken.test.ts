import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getStudioAuthToken, studioAuthHeader } from './studioAuthToken';

const PROJECT_ID = 'test-project';
const KEY = `__studio_auth_token_${PROJECT_ID}`;

/*
 * Every branch in here fails the same way — by returning `null`, which the caller turns into a
 * request with no `Authorization` header, which the route answers 401. That is a silently broken
 * button rather than an error anyone sees, so the branches are worth pinning down individually.
 *
 * The storage contract is Sanity's, not ours: key `__studio_auth_token_<projectId>`, value
 * `{"token":"..."}`. Read out of the installed `sanity` package (`getStorageKey` / `getStoredToken`)
 * rather than from documentation, because it is not public API. If Studio changes it, these tests
 * keep passing and the button starts 401ing — so the shape below is the thing to re-check first.
 */
const stubStorage = (store: Record<string, string>) => {
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store[key] ?? null
    }
  });
};

describe('getStudioAuthToken', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', PROJECT_ID);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('reads the token Studio stored', () => {
    stubStorage({ [KEY]: JSON.stringify({ token: 'sk-editor-token' }) });

    expect(getStudioAuthToken()).toBe('sk-editor-token');
  });

  it('is scoped to the project id, so another project’s entry is not picked up', () => {
    stubStorage({ __studio_auth_token_other_project: JSON.stringify({ token: 'sk-wrong-project' }) });

    expect(getStudioAuthToken()).toBeNull();
  });

  it('returns null on the server, where there is no storage to read', () => {
    // `window` genuinely absent — this helper is imported by a component that renders in the Studio,
    // so it must not throw during SSR.
    vi.stubGlobal('window', undefined);

    expect(getStudioAuthToken()).toBeNull();
  });

  it('returns null rather than throwing when storage is unusable or malformed', () => {
    // Signed out.
    stubStorage({});
    expect(getStudioAuthToken()).toBeNull();

    // Not JSON at all.
    stubStorage({ [KEY]: 'not json' });
    expect(getStudioAuthToken()).toBeNull();

    // JSON, but not the shape Studio writes.
    stubStorage({ [KEY]: JSON.stringify({ accessToken: 'sk-wrong-key' }) });
    expect(getStudioAuthToken()).toBeNull();

    // Present but empty — must not produce `Bearer ` with nothing after it.
    stubStorage({ [KEY]: JSON.stringify({ token: '' }) });
    expect(getStudioAuthToken()).toBeNull();

    // Right key, wrong type.
    stubStorage({ [KEY]: JSON.stringify({ token: 12_345 }) });
    expect(getStudioAuthToken()).toBeNull();

    // Private-mode restrictions surface as a throw from `getItem`.
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        }
      }
    });
    expect(getStudioAuthToken()).toBeNull();
  });

  it('returns null when the project id is not configured', () => {
    stubStorage({ [KEY]: JSON.stringify({ token: 'sk-editor-token' }) });
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', '');

    expect(getStudioAuthToken()).toBeNull();
  });
});

describe('studioAuthHeader', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', PROJECT_ID);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('builds the header the route expects', () => {
    stubStorage({ [KEY]: JSON.stringify({ token: 'sk-editor-token' }) });

    expect(studioAuthHeader()).toEqual({ Authorization: 'Bearer sk-editor-token' });
  });

  it('spreads to nothing when there is no token', () => {
    // Spread into a headers object by the caller, so `{}` has to mean "send no Authorization header"
    // — returning `{ Authorization: undefined }` would put a literal "undefined" on the wire.
    stubStorage({});

    expect(studioAuthHeader()).toEqual({});
    expect({ 'Content-Type': 'application/json', ...studioAuthHeader() }).not.toHaveProperty('Authorization');
  });
});
