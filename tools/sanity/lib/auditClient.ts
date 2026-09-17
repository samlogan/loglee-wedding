import { createClient } from 'next-sanity';

/**
 * Read-only Sanity client for the `yarn audit:*` scripts.
 *
 * ## Why there is no token
 *
 * Published reads on this kind of dataset are public — a `count(*[_type == 'page'])` returns a
 * result over plain HTTP with no `Authorization` header. Every audit reads published content only,
 * so a token would gate the scripts behind a secret they do not need, and anyone without it in their
 * environment would get a silent skip rather than an audit. There is deliberately no `token` key
 * here rather than an optional one: an optional token invites someone to add draft coverage later,
 * which would change what the audits count without changing what they print.
 *
 * If a future audit does need drafts, give it its own client and say so at the call site.
 *
 * ## Why the dataset is a default parameter but the projectId is not
 *
 * `NEXT_PUBLIC_SANITY_DATASET` usually says `production`, but a script that prints "production" in
 * its header while measuring whatever a developer's `.env.development` points at is worse than no
 * script. The dataset is a default parameter so a caller can override it explicitly and the header
 * says what was actually read.
 *
 * The `projectId` gets no such fallback, and that is deliberate. A hardcoded default means a clean
 * checkout of this boilerplate with no `.env` would query whichever project the literal names,
 * print its dataset name confidently, and cross-reference *that* project's content against this
 * repo's `sections/` — every number wrong, with nothing saying so. Failing loudly is much cheaper.
 */
export const auditClient = (dataset = 'production') => {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      'NEXT_PUBLIC_SANITY_PROJECT_ID is not set. The audit scripts read a real dataset and will not guess which one.'
    );
  }

  return createClient({
    projectId,
    dataset,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2021-03-25',
    // An audit that informs what gets deleted must read through, not serve a stale edge cache.
    useCdn: false,
    perspective: 'published'
  });
};
