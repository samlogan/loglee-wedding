import type { Metadata } from 'next';

import RsvpForm from '@/components/RsvpForm';
import Section from '@/components/Section';

import { submitRsvp } from './actions';

/**
 * The RSVP page — a route rather than a CMS page, for the reason `thank-you` gives: it is the target
 * of every "RSVP" link on the site, so it has to exist whether or not anyone has published a page
 * with this slug, and a static segment outranks the `[...slug]` catch-all.
 *
 * The page is only the frame. The heading, the questions and the submit path all live in
 * `components/RsvpForm`, which takes the server action as a prop — so its stories drive it with a
 * mock and never touch the server.
 *
 * `spacing` is the comp's own: 44px from the header to the heading at the 1280px frame, which is
 * `sm`, and 64px under the button, which is `md`. `lg` caps the content at the frame's 1200px, the
 * width the rail and the questions were drawn against.
 */
const RsvpPage = () => (
  <Section containerWidth="lg" name="rsvp" spacing={['sm', 'md']} theme="light">
    <RsvpForm action={submitRsvp} />
  </Section>
);

/**
 * Out of the index. The whole site is private, and this page in particular collects personal
 * details — nothing about it belongs in search results. `follow` stays on for the reason the
 * thank-you page keeps it: the site chrome's links are still crawled from here.
 */
export const metadata: Metadata = {
  robots: { follow: true, googleBot: { follow: true, index: false }, index: false },
  title: 'RSVP'
};

export default RsvpPage;
