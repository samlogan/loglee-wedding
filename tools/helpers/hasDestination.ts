import type { ILinkElement } from '@/tools/sanity/schema/elements/link';

import stringClean from './stringClean';

/**
 * Can `components/Link` take a reader anywhere with this link?
 *
 * The question an *action* has to answer before it draws a button. `Link` falls back to a `<span>`
 * when it cannot resolve a destination — honest for a label, but a filled pill that looks like a
 * control and does nothing is not something a section should draw on purpose. So a section asks this
 * first and draws nothing instead.
 *
 * It mirrors `Link`'s own branches, in `Link`'s order:
 *
 *   internal, or no type    `internalLink.pathname`, else `href`
 *   external                `externalLink`, else `href` — `Link` would otherwise emit an `<a>` with
 *                           no `href`, which is not a link at all
 *   any other type          a leftover `phone` with a digit in it, then a leftover `email` — `Link`
 *                           tests both fields whatever the type says, so an editor who switched a
 *                           link from "Phone" to "Action" still gets the `tel:` link
 *   phone                   a digit in `phone` or `href`, since `Link` strips everything else
 *   email                   `email`, else `href`
 *   action                  otherwise never — there is no action registry, so `Link` renders the span
 *
 * A mirror has to move with what it mirrors, so `hasDestination.test.ts` renders `Link` for every case
 * in its table and asserts the two agree on whether an `<a href>` comes out. If `Link` gains a branch —
 * an action registry, say, which its own comment invites — that test fails rather than this helper
 * quietly hiding a working button.
 *
 * ## Why not `linkEmpty`
 *
 * `linkEmpty` in `tools/helpers/link.ts` answers a neighbouring question — is the field filled in —
 * and for an internal link it reads `internalLink.slug.current` or `internalLink._ref`. Neither is
 * reliable on projected data: the projection has already dereferenced the reference, so there is no
 * `_ref`, and a `route` document keeps its slug in `path` rather than `slug`. A working link to a
 * route therefore reads as empty there, while `Link` renders it from `pathname` without complaint.
 * The answer has to come from the field `Link` actually reads.
 */
const hasDestination = (link?: ILinkElement | null): boolean => {
  if (!link) {
    return false;
  }

  const { email, externalLink, href, internalLink, phone } = link;
  // `stringClean`, as `Link` does, so a stega payload on the type cannot route it down the wrong branch.
  const linkType = stringClean(link.linkType);

  if (linkType === 'internal' || !linkType) {
    return Boolean(internalLink?.pathname || href);
  }

  if (linkType === 'external') {
    return Boolean(externalLink || href);
  }

  if ((linkType === 'phone' || phone) && /\d/.test(phone || href || '')) {
    return true;
  }

  if (linkType === 'email' || email) {
    return Boolean(email || href);
  }

  return false;
};

export default hasDestination;
