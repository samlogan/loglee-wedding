import type { Metadata } from 'next';

import ModelDuet from '@/components/ModelDuet';
import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import coupleNames from '@/helpers/coupleNames';
import { replyExtrasFor } from '@/tools/guests/replyExtras';
import type { ReplyExtras } from '@/tools/guests/replyExtras';
import { currentGuest } from '@/tools/guests/session';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { WEDDING_SETTINGS_QUERY } from '@/tools/sanity/lib/queries.groq';
import type { IWeddingSettingsDocument } from '@/tools/sanity/schema/documents/weddingSettings';

import styles from './styles.module.scss';

/**
 * The post-RSVP thank-you page.
 *
 * ## Why this is a route and not a CMS page
 *
 * Every other page on this site comes through `[...slug]`, assembled in the Studio from the
 * page-builder sections. This one does not, for one reason: **it is a destination rather than a
 * document**. The RSVP form will redirect here on success, so the path has to exist and keep
 * existing whether or not anyone has remembered to publish a page with that slug. A static segment
 * also takes precedence over the catch-all in Next's router, so if a `thank-you` page *is* ever
 * created in Sanity, this keeps winning — which is the correct outcome for a form target and would
 * be a confusing one for ordinary content.
 *
 * The words below are therefore in the file, not in the CMS, and that is a real trade rather than
 * an oversight: nobody can edit them without a deploy. It is the right side of the trade for three
 * short lines that must never be blank on a page a guest lands on immediately after submitting a
 * form. The couple's names are the exception and do come from the CMS, because they are the one
 * thing here that is already authored somewhere and would be embarrassing to have disagree.
 *
 * ## What is wired, and what is still missing
 *
 * **The redirect** is wired: `submitRsvp` in `app/(frontend)/rsvp/actions.ts` sends every saved
 * reply here, and the RSVP form calls `preloadDuet` the first time a guest focuses a field, so the
 * pair are usually loaded by the time they arrive.
 *
 * **A fallback image.** `ModelDuet` takes one and is not given one here, because there is no
 * rendered still of the pair in the dataset yet. Until there is, a guest with no WebGL — or on a
 * device `useModelCapability` judges too slow for two rigged characters — gets the hatched stage
 * rather than a picture. The words still render, which is the part that matters, but a still of the
 * two of them would be strictly better and the prop is already there for it.
 */

/*
 * The page's words, for a guest who is coming and for one who can't make it. The action sends the
 * second here as `?declined=1` (`app/(frontend)/rsvp/actions.ts`). It only chooses the words — a guest
 * who types it in sees a kinder page, nothing more — so it needs no more trust than that.
 */
const COPY = {
  coming: {
    heading: ['Thank', 'you'],
    text: 'Your reply is in. We cannot wait to celebrate with you.'
  },
  declined: {
    heading: ['We’ll', 'miss', 'you'],
    text: 'Thanks for letting us know. We’ll be thinking of you on the day.'
  }
};

const ThankYouPage = async ({ searchParams }: { searchParams: Promise<{ declined?: string }> }) => {
  const declined = (await searchParams).declined === '1';
  const copy = declined ? COPY.declined : COPY.coming;
  const [settings, guest] = await Promise.all([
    sanityFetch<Partial<IWeddingSettingsDocument> | null>({
      query: WEDDING_SETTINGS_QUERY,
      tags: ['weddingSettings']
    }),
    currentGuest().catch(() => undefined)
  ]);

  /*
   * The travel note for the guest's nationality, from Nationalities & payment in the Studio — only to a
   * signed-in guest who has replied, never in a page-builder section.
   *
   * Their stay, total and bank details are **not** shown here: they go in the thank-you email
   * (`sendThankYou`).
   */
  const { travel } =
    guest && !declined ? await replyExtrasFor(guest).catch((): ReplyExtras => ({})) : ({} as ReplyExtras);

  /*
   * "Sam & Lauren", one partner alone with no dangling ampersand, or the fallback names when neither
   * is filled in — a thank-you page signed "With love, " is worse than one signed with the names
   * hard-coded. The join, the fallback and the reasons for both live in `tools/helpers/coupleNames`,
   * which the home hero shares, so the two cannot print the couple differently.
   */
  const names = coupleNames(settings?.coupleNames);

  return (
    <Section containerWidth="sm" name="thank-you" spacing="lg" theme="light">
      <div className={styles.thankYou}>
        <Text
          alignment="center"
          as="p"
          className={styles.eyebrow}
          size="2xs"
          text="RSVP received"
          textTransform="uppercase"
          variant="mono"
          weight="regular"
        />

        {/*
         * The page headers' display size, in capitals, stacked a word to a line like the hero's names.
         * Stacked on purpose rather than left to wrap: on a phone both words fit on one line, and the
         * display tracking closes the space between them up until it reads as one word.
         */}
        <Text alignment="center" as="h1" size="md" spacing={['xs', 'sm']} textTransform="uppercase" variant="display">
          {copy.heading.map((line, index) => (
            <span className={styles.headingLine} key={line}>
              {index > 0 && ' '}
              {line}
            </span>
          ))}
        </Text>

        <Text
          alignment="center"
          as="p"
          size="lg"
          // The reply's detail is not repeated back — only whether they are coming, from the redirect.
          text={copy.text}
        />

        {/*
         * The scene, and the reason the page exists.
         *
         * `alt` names both of them and what they are doing, because for a reader who cannot see the
         * canvas this is the entire content of the block — the page's words are above it and do not
         * mention that there is a picture at all.
         */}
        {/* Not for a guest who can't make it: two characters dancing to celebrate a "no" reads wrong. */}
        {!declined && (
          <ModelDuet
            alt={`${names}, as 3D characters, dancing together to celebrate your reply`}
            className={styles.scene}
          />
        )}

        {travel && (
          <section aria-labelledby="thank-you-travel" className={styles.travel}>
            <Text
              as="h2"
              className={styles.travelLabel}
              id="thank-you-travel"
              size="2xs"
              text={travel.title || 'Travel tips'}
              textTransform="uppercase"
              variant="mono"
            />
            <TextBlock blocks={travel.content} />
          </section>
        )}
        {/* Handwritten in the plum, as the emails sign off and the home hero's byline is set. */}
        <Text
          alignment="center"
          as="p"
          className={styles.signoff}
          size="md"
          text={`With love, ${names}`}
          variant="heading"
        />
      </div>
    </Section>
  );
};

/**
 * Out of the index, deliberately.
 *
 * This is a form target, not content. A thank-you page in search results is a page people reach
 * without having done the thing it thanks them for, and — since it is the same URL for every guest
 * — it has nothing to say to them when they get there. `follow` stays on so the site chrome's links
 * are still crawled from here.
 */
export const metadata: Metadata = {
  robots: { follow: true, index: false },
  title: 'Thank you'
};

export default ThankYouPage;
