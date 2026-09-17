import type { Rewrite } from 'next/dist/lib/load-custom-routes';

/**
 * NextJS Rewrites
 * Rewrites allow you to map an incoming request path to a different destination path without changing the URL in the browser.
 * They act as a URL proxy, masking the destination path to make it appear as if the user hasn't changed their location on the site.
 * This is in contrast to redirects, which reroute to a new page and show the URL changes in the browser.
 * Refer to: https://nextjs.org/docs/app/api-reference/next-config-js/rewrites
 *
 * @property {string} source - The pattern representing the incoming request path.
 * @property {string} destination - The path to which the request should be redirected.
 * @property {boolean} [basePath=true] - If false, the basePath is not included when matching. Primarily used for external redirects.
 * @property {Array.<{type: string, key: string, value: string}>} [has] - Array of objects specifying conditions that must be met for the redirect to occur.
 * @property {Array.<{type: string, key: string, value: string}>} [missing] - Array of objects specifying conditions under which the redirect should not be applied.
 */
const rewrites: Rewrite[] = [
  //   {
  //     source: "/example",
  //     destination: "/"
  //   }
];

export default rewrites;
