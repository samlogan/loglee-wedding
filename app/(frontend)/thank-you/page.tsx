import type { Metadata } from 'next';

import ModelDuet from '@/components/ModelDuet';
import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import coupleNames from '@/helpers/coupleNames';
import { isFreeStay, stayPriceOf } from '@/helpers/guests';
import { replyExtrasFor, savedStayOf } from '@/tools/guests/replyExtras';
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

const ThankYouPage = async () => {
  const [settings, guest] = await Promise.all([
    sanityFetch<Partial<IWeddingSettingsDocument> | null>({
      query: WEDDING_SETTINGS_QUERY,
      tags: ['weddingSettings']
    }),
    currentGuest().catch(() => undefined)
  ]);

  /*
   * The guest's stay and total — the Sunday night included when their saved reply takes it — and the
   * travel note for their nationality, from Nationalities & payment in the Studio. Only to a
   * signed-in guest who has replied, never in a page-builder section.
   *
   * The bank details are **not** shown here: they go in the thank-you email only (`sendThankYou`).
   */
  const noExtras: ReplyExtras = {};
  const [extras, saved] = guest
    ? await Promise.all([replyExtrasFor(guest).catch(() => noExtras), savedStayOf(guest.id)])
    : [noExtras, { extraNight: false, staying: true }];
  const { travel } = extras;
  // Not staying at the venue: no stay and no total — only the travel note.
  const stay = guest && saved.staying ? stayPriceOf(guest, { extraNight: saved.extraNight }) : undefined;
  // A stay the couple are covering: the stay is shown, and nothing about paying for it.
  const free = isFreeStay(stay);
  const total =
    stay &&
    !free &&
    new Intl.NumberFormat('en-AU', { currency: 'AUD', maximumFractionDigits: 0, style: 'currency' }).format(stay.total);

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
          <span className={styles.headingLine}>Thank</span> <span className={styles.headingLine}>you</span>
        </Text>

        <Text
          alignment="center"
          as="p"
          size="lg"
          /*
           * Deliberately does not repeat the guest's answer back to them. The page is reached by a
           * redirect, so it has no access to what was submitted without threading it through a
           * query string or the session — and a thank-you page that confidently says "see you on
           * Saturday" to someone who declined is worse than one that says nothing about it.
           */
          text="Your reply is in. We cannot wait to celebrate with you."
        />

        {/*
         * The scene, and the reason the page exists.
         *
         * `alt` names both of them and what they are doing, because for a reader who cannot see the
         * canvas this is the entire content of the block — the page's words are above it and do not
         * mention that there is a picture at all.
         */}
        <ModelDuet
          alt={`${names}, as 3D characters, dancing together to celebrate your reply`}
          className={styles.scene}
        />

        {stay && free && (
          <section aria-labelledby="thank-you-stay" className={styles.payment}>
            <Text
              as="h2"
              className={styles.paymentLabel}
              id="thank-you-stay"
              size="2xs"
              text="Your stay"
              textTransform="uppercase"
              variant="mono"
            />
            <Text as="p" size="lg" weight="medium">
              {stay.stay} · {stay.nights} {stay.nights === 1 ? 'night' : 'nights'}
              {stay.extraNight && ', Sunday included'}
            </Text>
          </section>
        )}
        {stay && total && (
          <section aria-labelledby="thank-you-payment" className={styles.payment}>
            <Text
              as="h2"
              className={styles.paymentLabel}
              id="thank-you-payment"
              size="2xs"
              text="Your room contribution"
              textTransform="uppercase"
              variant="mono"
            />
            <Text as="p" size="lg" weight="medium">
              {stay.stay} · {stay.nights} {stay.nights === 1 ? 'night' : 'nights'}
              {stay.extraNight && ', Sunday included'} · {total}
            </Text>
            <Text as="p" className={styles.paymentNote} size="sm" text="How to pay is in your thank-you email." />
          </section>
        )}
        {travel && (
          <section aria-labelledby="thank-you-travel" className={styles.payment}>
            <Text
              as="h2"
              className={styles.paymentLabel}
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
