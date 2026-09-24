import { formatAmount } from './amountToken';
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

export interface ThankYouEmailInput {
  firstName: string;
  /** Their personal link, landing on the homepage. */
  homeLink: string;
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
  stay: { summary: string; total: string }[];
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
  const payment = items(paragraphsOf(input.payment));
  const travel = items(paragraphsOf(input.travel?.content));

  return {
    firstName,
    homeLink,
    payment,
    paymentHeading: heading('How to pay', payment),
    stay: stay
      ? [
          {
            summary: `${stay.stay} · ${stay.nights} ${stay.nights === 1 ? 'night' : 'nights'}${stay.extraNight ? ', Sunday included' : ''}`,
            total: formatAmount(stay.total)
          }
        ]
      : [],
    travel,
    travelHeading: heading(input.travel?.title || 'Travel tips', travel)
  };
};
