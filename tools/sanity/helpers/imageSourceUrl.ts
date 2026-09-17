/**
 * Validation for the image URL that `app/api/sanity/save-image` will fetch.
 *
 * `imageUrl` arrives in the request body, so without a host check the route is an open proxy: it
 * fetches whatever the caller names — link-local metadata endpoints such as `169.254.169.254`,
 * `localhost`, or anything else reachable from the server — and then uploads the response into
 * Sanity, where it is publicly readable on the CDN. That makes it an SSRF that *exfiltrates* rather
 * than merely probes, which is why the host check happens before any network call rather than by
 * inspecting the response.
 *
 * These live in a helper rather than inline in the route so they can be tested directly. The route
 * itself is awkward to test — it needs a Sanity write token and a real document — and a guard that
 * cannot be tested is a guard nobody will notice breaking.
 */

/**
 * The only hosts the route will fetch from.
 *
 * An allowlist, not a blocklist. Blocking `169.254.169.254` and the private ranges is whack-a-mole:
 * DNS names resolve to them, IPv6 has its own forms, and a redirect can leave the allowed host after
 * the check passes. Naming the two hosts we actually use ends the argument.
 *
 * These match what the caller produces: `VideoUrlInput` builds `https://img.youtube.com/vi/...` for
 * YouTube, and takes `thumbnail_url` from Vimeo's oEmbed API for Vimeo, which serves `i.vimeocdn.com`.
 *
 * **Projects adding another video provider must add its host here.** That is deliberately a code
 * change rather than an environment variable — an env-driven allowlist invites `*` on the first
 * deploy that breaks, and the failure mode of forgetting to extend this is a broken thumbnail button,
 * which someone reports. The failure mode of a permissive allowlist is silent.
 */
export const ALLOWED_IMAGE_HOSTS = ['img.youtube.com', 'i.vimeocdn.com'];

/**
 * Exact host match over a parsed URL, never a string test on the raw value.
 *
 * `startsWith('https://img.youtube.com')` passes for `https://img.youtube.com@attacker.test/x`,
 * where everything before the `@` is userinfo and the real host is `attacker.test`. `includes` and
 * `endsWith` fail on `img.youtube.com.attacker.test` and `evil-i.vimeocdn.com` respectively. Parsing
 * first and comparing `hostname` is the only form of this that is not a puzzle.
 */
export const isAllowedImageUrl = (value: unknown): boolean => {
  if (typeof value !== 'string' || !value) {
    return false;
  }

  let target: URL;

  try {
    target = new URL(value);
  } catch {
    return false;
  }

  // https only. `http:` is downgradeable in transit and `file:`/`data:` do not involve a network hop
  // at all — `file:///etc/passwd` would be read straight off the server's disk and uploaded.
  if (target.protocol !== 'https:') {
    return false;
  }

  return ALLOWED_IMAGE_HOSTS.includes(target.hostname);
};

/** A Sanity document id, with the optional `drafts.` prefix. */
export const isValidDocumentRef = (value: unknown): boolean =>
  typeof value === 'string' && /^(drafts\.)?[a-zA-Z0-9._-]+$/.test(value);

/**
 * A Sanity patch path, which is what the caller actually sends — **not** a bare field name.
 *
 * This started as a bare-identifier check and that was wrong: `VideoUrlInput` builds
 * `${idBase}.${thumbnailFieldKey}` from the Studio form id, so a legitimate value always contains a
 * dot, and `mediaSection` lives inside a page's `sections` array, so it also carries an array
 * accessor. Every real thumbnail save would have 400'd. Caught in review — the original tests only
 * asserted that dotted paths were *rejected*, and never that the caller's own output was accepted,
 * which is the case that decides whether the feature works.
 *
 * The grammar below is taken from Sanity's own `pathToString` (in the installed `sanity` package):
 * string segments join with `.`, an index segment renders `[0]`, a key segment renders
 * `[_key=="abc"]`, and an index tuple renders `[0:2]`. That is a closed set, so this accepts
 * everything Studio can produce and nothing else.
 *
 * Note what this is and is not protecting against. `fieldName` becomes a key in
 * `.set({ [fieldName]: ... })`, sent as JSON to the mutation API — it is not interpolated into GROQ,
 * so the quotes in `[_key=="..."]` are ordinary path syntax rather than an injection risk. The real
 * control is `verifyStudioUser`: the caller is a signed-in editor who could patch any field from the
 * Studio anyway. This is defence in depth that bounds the blast radius if that check is ever
 * weakened, which is why it is worth keeping precise rather than dropping.
 */
const IDENTIFIER = '[A-Za-z_][A-Za-z0-9_]*';
const ACCESSOR = String.raw`\[(?:\d+|\d+:\d+|_key=="[A-Za-z0-9_-]+")\]`;
const SEGMENT = `${IDENTIFIER}(?:${ACCESSOR})*`;
const FIELD_PATH = new RegExp(`^${SEGMENT}(?:\\.${SEGMENT})*$`);

/** Bounds a pathological input before it reaches the regex, and keeps the write shallow. */
const MAX_PATH_LENGTH = 256;
const MAX_PATH_SEGMENTS = 8;

export const isValidFieldPath = (value: unknown): boolean => {
  if (typeof value !== 'string' || !value || value.length > MAX_PATH_LENGTH) {
    return false;
  }

  if (value.split('.').length > MAX_PATH_SEGMENTS) {
    return false;
  }

  return FIELD_PATH.test(value);
};
