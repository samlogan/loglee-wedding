import 'server-only';
import { createClient } from '@sanity/client';
import { experimental_taintUniqueValue } from 'react';

/**
 * A Sanity client holding `SANITY_WRITE_TOKEN`, for server code that writes to the dataset.
 *
 * ## Keeping the token out of the browser
 *
 * - `server-only` above makes importing this module from a client component a build error.
 * - The variable has no `NEXT_PUBLIC_` prefix, so Next never inlines it into client code; it is
 *   `undefined` there even if something did reach it.
 * - The taint below makes React refuse to serialise the value into anything sent to the browser —
 *   a prop, a server action's return value — should it ever be passed along by mistake.
 *
 * ## Why `null` rather than a throw when it is not configured
 *
 * The RSVP page imports the action that imports this, so a module-level throw would fail the build
 * (and every render of `/rsvp`) wherever the token is not set — a deploy preview, a fresh checkout.
 * The caller checks for `null` and tells the guest their reply was not saved instead.
 *
 * `useCdn: false` for the reason `save-image` gives: a read here decides what to write, and the CDN
 * can serve a response from before the last write.
 */
const token = process.env.SANITY_WRITE_TOKEN;
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

if (token) {
  experimental_taintUniqueValue('Do not pass the Sanity write token to the client.', process, token);
}

const writeClient =
  token && projectId && dataset
    ? createClient({
        apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
        dataset,
        projectId,
        // A guest is waiting on the button. An unresponsive API should become an error they can act
        // on, not a spinner that outlives the function's own time limit.
        timeout: 10_000,
        token,
        useCdn: false
      })
    : null;

export default writeClient;
