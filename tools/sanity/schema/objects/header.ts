import { defineType } from 'sanity';

import type { IButtonElement } from '@/tools/sanity/schema/elements/button';

import type { ILinkElement } from '../elements/link';

/**
 * The header's editable content.
 *
 * Five flat links and one action, which is the whole of the design (Figma nodes 1:45 desktop,
 * 1:103 mobile). The dropdown machinery that used to live here — `dropdown`, `navSublinks` and a
 * `navSublink` object type — was removed with the renderer that drew it: a Studio toggle whose
 * only effect is to hide the nav item's own link is worse than no toggle at all. It was also the
 * sole reason `HeaderNavigationDesktop` reached for `Link`'s `forceLinkWhenEmpty`, which rendered
 * a dropdown parent as `<a href="#" role="button">` — a control Space does not activate and a
 * click navigates away from (WCAG 2.1.1, 4.1.2). Both are gone.
 *
 * The **reply-by line is not here**. It lives on the `weddingSettings` singleton as `rsvpLabel`,
 * because the same date appears in the nav on every page and beside the RSVP action on the home
 * page; two fields would drift. `button` supplies the action's destination and its short label,
 * which is what the bar shows on a phone where there is no room for the date.
 */
interface IHeaderObject {
  navItems: {
    _key?: string;
    title: string;
    link: ILinkElement;
  }[];
  addButton: boolean;
  button?: IButtonElement;
}

const navLink = defineType({
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    },
    {
      name: 'link',
      title: 'Link',
      type: 'linkElement'
    }
  ],
  name: 'navLink',
  preview: {
    prepare: (selection) => ({
      title: selection.title || 'Nav Link'
    }),
    select: {
      title: 'title'
    }
  },
  title: 'Nav Link',
  type: 'object'
});

const header = defineType({
  fields: [
    {
      /*
       * This is the only place the "one list, rendered twice" decision surfaces to a human.
       *
       * `components/Footer` renders this same array — deliberately, so the bar and the foot cannot
       * disagree about what the site's pages are (see `components/Layout`, which passes the one
       * object to both). Without saying so here, an editor removing a link intending a bar-only
       * change removes it from the footer too and nothing in the Studio tells them.
       */
      description:
        'The links in the middle of the bar, the same list inside the mobile menu, and the same list in the footer. Removing one removes it from all three.',
      name: 'navItems',
      of: [{ type: 'navLink' }],
      title: 'Nav Items',
      type: 'array'
    },
    {
      name: `addButton`,
      title: `Add RSVP Action`,
      type: `boolean`
    },
    {
      description:
        'The accent pill at the right of the bar. The label here is the short form shown on a phone — the "reply by" line on desktop comes from Wedding Settings.',
      hidden: ({ parent }) => !parent?.addButton,
      name: `button`,
      title: `RSVP Action`,
      type: `buttonElement`
    }
  ],
  name: 'header',
  preview: {
    prepare() {
      return {
        title: `Header`
      };
    }
  },
  title: 'Header',
  type: 'object'
});

export { header, navLink };
export type { IHeaderObject };
