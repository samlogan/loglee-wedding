import type { Redirect } from 'next/dist/lib/load-custom-routes';

/**
 * NextJS Redirects
 * Redirects allow you to redirect an incoming request path to a different destination path.
 * Refer to: https://nextjs.org/docs/api-reference/next.config.js/redirects
 *
 * @property {string} source - The pattern representing the incoming request path.
 * @property {string} destination - The path to which the request should be redirected.
 * @property {boolean} permanent - If true, uses the 308 status code for a permanent redirect; if false, uses the 307 status code for a temporary redirect.
 * @property {boolean} [basePath=true] - If false, the basePath is not included when matching. Primarily used for external redirects.
 * @property {boolean} [locale=true] - If false, the locale is not included in the path matching.
 * @property {Array.<{type: string, key: string, value: string}>} [has] - Array of objects specifying conditions that must be met for the redirect to occur.
 * @property {Array.<{type: string, key: string, value: string}>} [missing] - Array of objects specifying conditions under which the redirect should not be applied.
 */
const redirects: Redirect[] = [
  // {
  //   source: "/example",
  //   destination: "/",
  //   permanent: true
  // }
];

export default redirects;
