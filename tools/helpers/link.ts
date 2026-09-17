import type { ILinkElement } from '../sanity/schema/elements/link';

export const linkEmpty = (link: ILinkElement) => {
  if (!link) {
    return true;
  }

  const { linkType } = link;

  if (!linkType) {
    return true;
  }

  if (linkType === 'internal') {
    return !(link?.internalLink?.slug?.current || link?.internalLink?._ref);
  }

  if (linkType === 'external') {
    return !link?.externalLink;
  }

  if (linkType === 'phone') {
    return !link?.phone;
  }

  if (linkType === 'email') {
    return !link?.email;
  }

  if (linkType === 'action') {
    return !link?.action;
  }

  return false;
};

/**
 * One spelling for a path, so two of them can be compared.
 *
 * Two normalisations, each fixing a real mismatch rather than a hypothetical one:
 *
 * - `/home/` → `/`. Sanity stores the home page's `pathname` as `/home/`, and `components/Link`
 *   rewrites exactly that value to `/` when it builds the `href`. So the browser is at `/` while the
 *   nav item still says `/home/`, and a strict comparison could never mark Home as the current page
 *   — on the one page where getting it wrong is most obvious.
 * - A trailing slash. `next.config.js` sets `trailingSlash: true`, so `usePathname()` always returns
 *   one; a CMS value entered without it would otherwise never match.
 */
const normalisePath = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.replace(/\/+$/, '');
  return trimmed === '' || trimmed === '/home' ? '/' : trimmed;
};

export const isCurrent = (currentPath: string, link: ILinkElement) => {
  const current = normalisePath(currentPath);
  return (
    current !== undefined &&
    (current === normalisePath(link?.internalLink?.pathname) || current === normalisePath(link?.externalLink))
  );
};
