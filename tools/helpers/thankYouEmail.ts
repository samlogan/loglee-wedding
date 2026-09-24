import { formatAmount } from './amountToken';
import { isFreeStay } from './guests';
import type { StayPrice } from './guests';

/*=============================================>>>>>
= The thank-you email =
===============================================>>>>>*/

/**
 * The thank-you email a guest is sent once their RSVP is saved — a Loops *transactional* email, so
 * what varies from guest to guest travels as data variables rather than contact properties. See
 * `tools/emails/build.mjs` for the template that reads them.
 *
 * Loops fills a variable in as text, not HTML, so Sanity's rich text arrives as plain paragraphs,
 * one array item each, and the template repeats one `<mj-text>` per item with `<loops-array>`. An
 * array is also the only conditional Loops has: an empty one renders nothing, which is how a guest
 * with no stay, or no travel note, gets an email without that part — headings included.
 */

interface Item {
  text: string;
}

/** The email's opening paragraphs when Wedding Settings → Emails → Thank-you Email has none. */
export const THANK_YOU_INTRO_DEFAULT = [
  'Your reply is in, and we can’t wait to celebrate with you. Here’s what you need for the weekend.'
];

export interface ThankYouEmailInput {
  firstName: string;
  /** Their personal link, landing on the homepage. */
  homeLink: string;
  /** The opening paragraphs, from Sanity. Blank ones are dropped; none at all is the default. */
  intro?: unknown;
  /** Their stay and total, the Sunday night included when they took it. */
  stay?: StayPrice;
  /** The payment details for their region, from Sanity. */
  payment?: SanityTextBlock[] | null;
  /** The travel note for their nationality, from Sanity — none for most guests. */
  travel?: { title?: string | null; content?: SanityTextBlock[] | null } | null;
}

export interface ThankYouEmailVariables {
  firstName: string;
  homeLink: string;
  intro: Item[];
  stay: { summary: string }[];
  /** The total, when there is one to pay — none for a stay the couple are covering. */
  stayTotal: { total: string }[];
  paymentHeading: Item[];
  payment: Item[];
  travelHeading: Item[];
  travel: Item[];
}

/**
 * Rich text as plain paragraphs: one per text block, list items marked with a bullet, and anything
 * that is not text — an image, a button — left out. A line break inside a block is kept as `\n`; the
 * template sets `white-space: pre-line` so it shows where the client supports it.
 */
export const paragraphsOf = (blocks?: SanityTextBlock[] | null): string[] =>
  (blocks ?? [])
    .filter((block) => block?._type === 'block')
    .map((block) => {
      const text = (block.children ?? [])
        .map((child) => child?.text ?? '')
        .join('')
        .trim();
      return text && block.listItem ? `• ${text}` : text;
    })
    .filter(Boolean);

const items = (texts: string[]): Item[] => texts.map((text) => ({ text }));

/** One item when there is something under the heading, none when there is not. */
const heading = (text: string | null | undefined, under: Item[]): Item[] =>
  under.length > 0 && text?.trim() ? [{ text: text.trim() }] : [];

export const thankYouVariables = (input: ThankYouEmailInput): ThankYouEmailVariables => {
  const { firstName, homeLink, stay } = input;
  // A stay the couple are covering: the stay is shown, and nothing about paying for it.
  const free = isFreeStay(stay);
  const payment = free ? [] : items(paragraphsOf(input.payment));
  const travel = items(paragraphsOf(input.travel?.content));
  const intro = (Array.isArray(input.intro) ? input.intro : [])
    .filter((paragraph): paragraph is string => typeof paragraph === 'string')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return {
    firstName,
    homeLink,
    intro: items(intro.length > 0 ? intro : THANK_YOU_INTRO_DEFAULT),
    payment,
    paymentHeading: heading('How to pay', payment),
    stay: stay
      ? [
          {
            summary: `${stay.stay} · ${stay.nights} ${stay.nights === 1 ? 'night' : 'nights'}${stay.extraNight ? ', Sunday included' : ''}`
          }
        ]
      : [],
    stayTotal: stay && !free ? [{ total: formatAmount(stay.total) }] : [],
    travel,
    travelHeading: heading(input.travel?.title || 'Travel tips', travel)
  };
};
