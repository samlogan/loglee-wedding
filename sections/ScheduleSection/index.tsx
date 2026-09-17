import type { FC } from 'react';

import Container from '@/components/Container';
import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import classNames from '@/helpers/classNames';
import hasBlockContent from '@/helpers/hasBlockContent';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { IScheduleSection } from '@/tools/sanity/schema/sections/scheduleSection';

import styles from './styles.module.scss';

const ScheduleSection: FC<IScheduleSection> = (props) => {
  const { days } = props;

  /*
   * Nothing at all rather than an empty shell.
   *
   * `Section` paints `--bg-default` and its own padding, so returning it with no children publishes
   * a blank coloured strip on the page. The schema requires at least one day, so the only way here
   * is a half-built section in the Studio's Presentation preview — where rendering nothing is the
   * honest signal.
   */
  if (!days?.length) {
    return null;
  }

  return (
    <Section
      name="ScheduleSection"
      theme={getSectionTheme(props, 'light')}
      /*
       * `full`, so the section renders its children directly and each day band owns the page's full
       * width. The requirement is a rule "spanning the page", and `Section`'s own `Container` would
       * inset it by the gutter — so the `Container` moves *inside* each band instead, wrapping only
       * the content. That also makes the container query below per-band, which is what it should be.
       */
      full
      {...getSectionSpacingProps(props)}
      /*
       * **After** the spread, deliberately: `getSectionSpacingProps` returns a hardcoded
       * `spacing: 'lg'`, so a `spacing` written before it is silently dead and `yarn audit:layout`
       * reports exactly that ordering.
       *
       * `none`, and this is the one section where that is the measurement rather than a shortcut.
       * On Planner the header container ends at y = 369.75 and the first day band's rule starts at
       * y = 369.75 — no gap at all — and the bands are contiguous with each other after that. The
       * vertical rhythm is the band's own `padding-block` (40px desktop / 24px mobile), because the
       * rule has to sit on the join rather than floating in the middle of a gap. Any `--section-
       * spacing-*` step here would push the first rule away from the header above it.
       *
       * The editor's two remove-spacing toggles therefore have nothing to remove. They stay wired —
       * dropping the spread to say so would take `removeTopSpacing` away from a future variant of
       * this section for no gain.
       */
      spacing="none"
    >
      {/*
       * `role="list"` is not redundant: the global reset sets `list-style-type: none` on every `ol`
       * and `ul`, and WebKit strips the `list` role from an unstyled list that does not claim it
       * back — VoiceOver would announce these bands as loose text. Same reasoning as
       * `components/Footer` and `HeaderDisplaySection`.
       *
       * `ol` and not `ul` on both levels. Days run Friday → Sunday and events run down the clock;
       * reordering either changes the meaning, which is the whole test for an ordered list.
       */}
      <ol className={styles.days} role="list">
        {days.map((day) => {
          /*
           * An event with neither a time nor a title is a row an editor added and abandoned. Both
           * are `required()` in the schema, so this only catches unpublished or legacy content —
           * but a blank row still draws a hairline and 40px of padding, which reads as a rendering
           * bug rather than as missing content. Filtered here rather than in the projection so a
           * story passing raw mock data behaves exactly like the CMS.
           */
          const events = day.events?.filter((event) => Boolean(event?.time?.trim() || event?.title?.trim())) ?? [];
          const hasEvents = events.length > 0;

          return (
            <li className={styles.day} key={day._key}>
              <Container className={styles.dayContainer}>
                {/*
                 * `dayInner_split` is applied only when there is something to split *with*.
                 *
                 * Without it a day with no events would still reserve the design's 400px summary
                 * column and leave two thirds of the band empty. The modifier gates the entire
                 * two-column branch, so an event-less day is a full-width summary — which is the
                 * degenerate case the AC calls out, handled rather than tolerated.
                 */}
                <div className={classNames(styles.dayInner, { [styles.dayInner_split]: hasEvents })}>
                  <div className={styles.summary}>
                    {/*
                     * Raw elements, not `Text`, for the three mono labels in this section (eyebrow,
                     * time, location). `Text` has no `mono` variant — logged as MAM-1927 — so the
                     * family is re-declared in the module, and once the module owns the family,
                     * size, weight and tracking, routing the element through `Text` would add a
                     * class that styles nothing. `HeaderDisplaySection.metaItem` does the same.
                     *
                     * Sentence case in the CMS, capitals from CSS: short literal all-caps runs are
                     * what screen readers most often spell out letter by letter, and
                     * `text-transform` already guarantees the display.
                     */}
                    {Boolean(day.eyebrow?.trim()) && <p className={styles.eyebrow}>{day.eyebrow}</p>}
                    {/*
                     * `as="h2"` is forced rather than taken from the editor's choice in `TitleInput`,
                     * for the same reason `HeaderDisplaySection` forces `h1`: the page's outline is
                     * a property of the page. This section always sits beneath that header, so h2 is
                     * the level, and each event title below is the h3 under it.
                     *
                     * `variant="display"` is the Archivo Black tier; `size="md"` reads `--display-md`,
                     * which `.dayTitle` re-points — see the note in styles.module.scss for why 132px
                     * is the wrong wide anchor for this particular heading and 88px is the drawn one.
                     */}
                    <TextTitle
                      className={styles.dayTitle}
                      title={day.title}
                      as="h2"
                      variant="display"
                      size="md"
                      textTransform="uppercase"
                    />
                    {Boolean(day.date?.trim()) && (
                      <Text
                        className={styles.date}
                        as="p"
                        text={day.date}
                        variant="heading"
                        size="xs"
                        weight="medium"
                      />
                    )}
                    {/*
                     * `hasBlockContent` and not `Boolean(content?.length)`: an editor who types into
                     * a rich-text field and deletes it leaves one `normal` block holding an empty
                     * child, which Sanity does not unset. `.length` is 1, `TextBlock` renders the
                     * empty `<p>`, and the summary column gains a dead 21px line.
                     */}
                    {hasBlockContent(day.content) && (
                      <TextBlock className={styles.intro} blocks={day.content} config={{ p: { size: 'md' } }} />
                    )}
                  </div>
                  {hasEvents && (
                    <ol className={styles.events} role="list">
                      {events.map((event) => (
                        /*
                         * ## The reflow, and why the DOM order is what it is
                         *
                         * These four children are placed by `grid-area`, so **this source order is
                         * the only reading order** — neither layout re-sequences the document, and
                         * a screen reader gets "[from 2pm], Reception, Arrivals & check in, Drop
                         * your bags…" at every width. It reads as a calendar entry: when, where,
                         * what, detail.
                         *
                         * It is also exactly the **mobile** visual order, which is deliberate twice
                         * over. The stacked layout is the unconditional default (a container query
                         * cannot resolve before its container is laid out, so the first paint is the
                         * narrow branch), and making the default branch need no re-placement at all
                         * means that first paint is correct visually *and* semantically. Only the
                         * wide branch reorders, lifting the location out from beside the time and
                         * parking it at the right of the title's line.
                         *
                         * Nothing here is focusable, so WCAG 2.4.3 (Focus Order) has nothing to
                         * disagree with; 1.3.2 (Meaningful Sequence) is satisfied by the order
                         * above. `MobileReadingOrder` in the stories asserts both halves — that the
                         * DOM order is this, and that on a phone it is also what a sighted reader
                         * sees.
                         */
                        <li className={styles.event} key={event._key}>
                          {/*
                           * The brackets are a type treatment, not content, so the CMS stores
                           * "from 2pm" and they are added here — and `aria-hidden` keeps them out of
                           * the accessibility tree.
                           *
                           * Real spans rather than `::before` / `::after`: generated `content` *is*
                           * exposed in the accessibility tree by the CSSOM-AAM mapping and is
                           * announced by NVDA and JAWS, so a pseudo-element would have traded a
                           * clean DOM for "left bracket from 2pm right bracket". This way the
                           * rendered text still equals the stored value plus visible decoration,
                           * which is what the stories assert on.
                           */}
                          <p className={styles.time}>
                            <span aria-hidden="true">[</span>
                            {event.time}
                            <span aria-hidden="true">]</span>
                          </p>
                          {Boolean(event.location?.trim()) && <p className={styles.location}>{event.location}</p>}
                          {/*
                           * `Text` rather than `TextTitle`, because the field is a plain string and
                           * the design sets this in the *body* family at a semibold weight —
                           * Instrument Sans SemiBold, not the Archivo heading tier. `TextTitle` has
                           * no `weight` prop to carry that (it forwards variant/size/colour/
                           * transform only), and it would add a `stripTitleTags` pass to a value
                           * that never holds a tag. `TextTitle` delegates to `Text` anyway.
                           */}
                          <Text
                            className={styles.eventTitle}
                            as="h3"
                            text={event.title}
                            variant="body"
                            size="2xl"
                            weight="semibold"
                          />
                          {hasBlockContent(event.description) && (
                            <TextBlock
                              className={styles.description}
                              blocks={event.description}
                              config={{ p: { color: 'themeFgMuted', size: 'md' } }}
                            />
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </Container>
            </li>
          );
        })}
      </ol>
    </Section>
  );
};

export default ScheduleSection;
