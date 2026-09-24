/**
 * A path on this site to send someone to after signing in — or the fallback.
 *
 * Only a path: `/weekend/`, never `//elsewhere.com` (a protocol-relative URL, which browsers treat as
 * another site), an absolute URL, or anything with a backslash, which some browsers read as a slash.
 * The entry page and personal links both take a destination from the address bar, so both check it
 * here — an open redirect would let a crafted link bounce a guest from this site to anywhere.
 */
const safePath = (value: unknown, fallback = '/'): string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : fallback;

export default safePath;
