import type { FC } from 'react';

import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import TextTitle from '@/components/TextTitle';
import resolveAmountCopy from '@/helpers/amountToken';
import classNames from '@/helpers/classNames';
import formatOrdinal from '@/helpers/formatOrdinal';
import hasBlockContent from '@/helpers/hasBlockContent';
import stripTitleTags from '@/helpers/stripTitleTags';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import type { ITwoColumnListSection } from '@/tools/sanity/schema/sections/twoColumnListSection';

import styles from './styles.module.scss';

const TwoColumnListSection: FC<ITwoColumnListSection> = (props) => {
  const { variant = 'list', eyebrow, title, content, asideEyebrow, items, contribution } = props;

  /*
   * An array of plain strings keeps the empty ones an editor tabbed through, and a blank item would
   * still draw an ordinal and a row of padding. Filtered here rather than in the projection so a
   * story passing raw mock data behaves exactly like the CMS — and, critically, so the **ordinals
   * are numbered from the filtered array**: numbering the raw one would leave a visible gap where a
   * blank row used to be.
   *
   * ## The key is carried, not derived at render
   *
   * Keyed by the item's own text, because these are short lines an editor reorders in place and an
   * index key makes React keep the old text in the old node on a reorder — which here would also
   * detach the text from its ordinal.
   *
   * That needs the text to be unique, and `items` carries `Rule.unique()` — but a Sanity validation
   * rule is **publish-time**, and Presentation renders drafts. So a draft mid-edit really can hold
   * two identical lines, and `key={item}` hands React duplicate keys for them: a console error and
   * undefined reconciliation, in the one environment an editor is watching. This file already makes
   * exactly that argument in the other direction — `tools/helpers/amountToken.ts` refuses to trust
   * `Rule.min(0)` on `amountPerNight` for the same reason — and the two should agree.
   *
   * So the duplicate is disambiguated by how many times it has been seen, which leaves the common
   * case byte-identical to `key={item}` (first occurrence keeps its bare text) and makes the
   * degenerate one merely ugly instead of undefined. The rule stays: it is still what keeps a
   * *published* list stable across a reorder.
   *
   * The trimmed text is what renders as well as what keys, so the two cannot disagree — an item of
   * `'  Swimmers  '` was previously filtered on its trimmed form and rendered raw.
   */
  const seen = new Map<string, number>();
  const listItems = (items ?? []).reduce<{ key: string; text: string }[]>((accumulator, item) => {
    const text = item?.trim();

    if (!text) {
      return accumulator;
    }

    const occurrence = seen.get(text) ?? 0;
    seen.set(text, occurrence + 1);
    accumulator.push({ key: occurrence === 0 ? text : `${text}#${occurrence}`, text });

    return accumulator;
  }, []);

  /*
   * The whole `{amount}` contract, in one call. `resolveAmountCopy` picks between the two copy
   * fields and substitutes the figure as a marked inline run; see `tools/helpers/amountToken.ts` for
   * the four cases it decides between and why. It is called only on the variant that has a
   * `contribution` to resolve — on a `list` section the projection does not even return the key.
   */
  const copy = variant === 'richText' ? resolveAmountCopy(contribution) : undefined;

  const hasList = variant === 'list' && listItems.length > 0;
  const hasCopy = variant === 'richText' && hasBlockContent(copy);
  /*
   * The eyebrow alone does not make an aside. It is a label for the column's content, so rendering
   * it without any would draw a heading over nothing — and, since the eyebrow is a `<p>`, would put
   * a stray line of uppercase mono where the design draws a list. Same reasoning as
   * `HeaderDisplaySection`, which renders no aside at all rather than an empty one.
   */
  const hasAside = hasList || hasCopy;
  /*
   * The same rule as `hasAside`, applied to the other column — which it was not.
   *
   * `eyebrow` used to count here, so a section holding nothing but one passed this test and drew the
   * panel around a single line of uppercase mono. That is the exact outcome the note above refuses
   * for `asideEyebrow`, and an eyebrow is the same thing on either side: a label *for* the column's
   * content, which says nothing on its own. Both columns now ask whether they have something to
   * label.
   *
   * `stripTitleTags(title).text` and **not** `title.trim()`, which is what this tested and which
   * made the whole guard very nearly unreachable. `title` arrives from `TitleInput` as markup —
   * `'<h2>Cocktail…</h2>'` — so an emptied field is the string `'<h2></h2>'`, and `.trim()` on that
   * is truthy. Every title field an editor has ever touched therefore passed. The schema gets this
   * right (`stripTitleTags(value ?? '').trim()` in its `custom()` rule, with a comment naming the
   * single-space case exactly); the component simply did not mirror it, so the two halves of the
   * same question disagreed.
   */
  const hasStatement = Boolean(stripTitleTags(title).text.trim()) || hasBlockContent(content);

  /*
   * Nothing at all rather than an empty shell.
   *
   * The panel paints `--bg-default` and 40px of padding, so returning it with no children publishes
   * a blank dark box on the page. `title` is `required()` in the schema, so the only way here is a
   * half-built section in the Studio's Presentation preview — where rendering nothing is the honest
   * signal. `ScheduleSection` bails the same way and for the same reason.
   */
  if (!(hasStatement || hasAside)) {
    return null;
  }

  /*
   * ## Two themes, and why the section is not simply `dark`
   *
   * The drawn panel is `--pine-600` (#1e4632) under `--stone-50` (#f3f1ea) text — which is exactly
   * `[data-theme='dark']`'s `--bg-default` / `--fg-default` pair, so the ticket's instruction that
   * "the dark treatment comes from the theme rather than hardcoded values" resolves to the dark
   * theme rather than to the `--button-secondary-*` ink-chip pair. Measured before deciding, because
   * the two are easy to confuse: the ink chip is `--stone-900` (#131412), which is the rule colour
   * on the *bands above* this one, not the panel. `PlayerCard` picked the wrong one of the two.
   *
   * But the theme cannot go on `Section`. `Section` paints `--bg-default` across its whole width, so
   * `theme="dark"` would publish a full-bleed green strip — and the design draws an **inset** panel
   * on a light page (node 1:669 sits at x=-959 inside a 1280 frame, i.e. one container gutter in on
   * each side). So the section keeps the page's theme and the panel carries the other one on its own
   * `data-theme`, where the whole `[data-theme]` block in `_variables.scss` re-points beneath it:
   * `--bg-default`, `--fg-default`, `--radius-*` consumers, the `currentColor` the amount chip mixes
   * from. Nothing in `styles.module.scss` names a colour.
   *
   * The panel is the *inverse* of the section rather than fixed at dark, so the Studio's Light/Dark
   * radio does something honest: it flips which of the two is the page and which is the panel,
   * keeping the contrast the design is built on. Fixing the panel at dark would have made that radio
   * inert, which is the bug that was just fixed in `sections.groq.ts` — the projection did not
   * return `themeOptions` at all, so nobody had noticed the control did nothing.
   *
   * `'light'` is the fallback because that is the page both instances sit on.
   */
  const pageTheme = getSectionTheme(props, 'light');
  const panelTheme: ProjectTheme = pageTheme === 'dark' ? 'light' : 'dark';

  return (
    <Section
      name="TwoColumnListSection"
      theme={pageTheme}
      {...getSectionSpacingProps(props)}
      /*
       * **After** the spread, deliberately: `getSectionSpacingProps` returns a hardcoded
       * `spacing: 'lg'`, so a `spacing` written before it is silently dead and `yarn audit:layout`
       * reports exactly that ordering.
       *
       * `none`, and it is measured rather than a shortcut. All four frames draw **zero** gap above
       * this band: on Planner the day band above ends at y = 4083.0 and this one starts at 4083.0
       * (desktop) / 4392.6 and 4392.6 (mobile); on Stay the card grid's container ends at 5815.5 and
       * the panel starts at 5815.4 (desktop) / 6408.4 and 6408.4 (mobile). The gap a reader sees is
       * the *preceding* section's own bottom padding — 40px inside Planner's band, 48px inside
       * Stay's card container — which is the convention every section on these pages follows, and
       * the one `ScheduleSection` states at length. Adding a `--section-spacing-*` step here would
       * push this panel away from the section above it by an amount the design never draws.
       *
       * The editor's two remove-spacing toggles therefore have nothing to remove. They stay wired —
       * dropping the spread to say so would take `removeTopSpacing` away from a future page that
       * puts this section somewhere the rhythm differs, for no gain.
       */
      spacing="none"
    >
      {/*
       * The query container is the panel itself, so the queried inline size is its *content* box —
       * panel minus its own padding, which is precisely what the two columns divide. Putting it on
       * the `Container` instead would query the panel's border box and make the switch value depend
       * on the padding it is meant to be independent of.
       *
       * `inline-size` and not `size`: the panel's width comes from the page, its height from its
       * content, and containing the height would collapse it. The containment cost is the one
       * `HeaderDisplaySection` and `ScheduleSection` both document — an inline-size container does
       * not contribute to its own intrinsic width, so inside a shrink-to-fit ancestor it collapses
       * to its padding. Safe here for the same reason: sections render as block children of `<main>`
       * and of a plain `<div>` in Storybook.
       */}
      <div className={styles.panel} data-theme={panelTheme}>
        {/*
         * `hasStatement && hasAside`, not `hasAside` alone.
         *
         * The modifier flexes **both** columns to `1 1 0`, so gating it on one of them meant an
         * aside-only section still had the rule applied — and the rule names `.statement`, a column
         * that is no longer there. Both sides of this section are optional, which is what makes it
         * different from `HeaderDisplaySection.row_split` and `ScheduleSection.dayInner_split`: in
         * those, only the aside can be absent, so a one-sided gate is the whole condition. Here it
         * is half of it.
         */}
        <div className={classNames(styles.inner, { [styles.inner_split]: hasStatement && hasAside })}>
          {/*
           * Gated, for the reason the aside beside it is. `.inner_split` flexes both columns to
           * `1 1 0`, so an unconditional statement column on a section whose title and body are both
           * empty — a half-built draft in Presentation — gave away half the panel to an empty div
           * with the list squeezed into the other half. Each column now renders only when it has
           * something in it, and the one that does takes the width.
           */}
          {hasStatement && (
            <div className={styles.statement}>
              {/*
               * A raw `<p>`, not `Text`. `Text` has no `mono` variant — logged as MAM-1927 — so the
               * family is re-declared in the module, and once the module owns the family, size, weight
               * and tracking, routing the element through `Text` would add a class that styles
               * nothing. `ScheduleSection.eyebrow` and `HeaderDisplaySection.metaItem` do the same.
               */}
              {Boolean(eyebrow?.trim()) && <p className={styles.eyebrow}>{eyebrow}</p>}
              {/*
               * `as="h2"` is forced rather than taken from the editor's choice in `TitleInput`, for the
               * same reason `HeaderDisplaySection` forces `h1`: the page's outline is a property of the
               * page. This section sits beneath a `headerDisplaySection` on both pages it is drawn on,
               * so h2 is the level.
               *
               * `variant="display"` is the Archivo Black tier; `size="md"` reads `--display-md`, which
               * `.title` re-points — the global token reaches 132px for a page header and this
               * statement is drawn at 44px / 48px. See the note in styles.module.scss for why the two
               * variants re-point it to different values.
               */}
              <TextTitle
                className={classNames(styles.title, { [styles.title_richText]: variant === 'richText' })}
                title={title}
                as="h2"
                variant="display"
                size="md"
                textTransform="uppercase"
              />
              {/*
               * `hasBlockContent` and not `Boolean(content?.length)`: an editor who types into a
               * rich-text field and deletes it leaves one `normal` block holding an empty child,
               * which Sanity does not unset. `.length` is 1, `TextBlock` renders the empty `<p>`,
               * and the statement column gains a dead line plus a flex gap.
               *
               * No `config`. This carried `config={{ p: { size: 'md' } }}`, which restates
               * `TextBlock`'s own default for both handlers a `blockContentSimple` block can reach
               * — `p` and, via `config.span`, `normal` — and so did nothing at all. An override that
               * cannot be distinguished from the default is worse than none: it reads as a decision
               * the section made, so the next person to change the body's size changes this line and
               * sees no effect.
               */}
              {hasBlockContent(content) && <TextBlock className={styles.body} blocks={content} />}
            </div>
          )}
          {hasAside && (
            <div className={styles.aside}>
              {/*
               * An `<h3>`, where the eyebrow on the other column is a `<p>` — and the asymmetry is
               * the point rather than an inconsistency.
               *
               * The two are drawn identically and share `.eyebrow`, but they do different jobs. The
               * statement's eyebrow is a kicker: it reads immediately before the `<h2>` it belongs
               * to, which is the conventional overline pattern and needs no element of its own.
               * This one labels the **list beneath it** — "What to bring" over four items — and
               * that association existed only in the type and the proximity. A screen-reader user
               * landing on the list heard "list, 4 items" with no idea what of, and one navigating
               * by heading never met the label at all.
               *
               * This is the option the note on the `<ol>` below did not consider. It rejected
               * `aria-label` (duplicates CMS copy into the accessibility tree, where it drifts) and
               * `aria-labelledby` (needs a page-unique id, and a server component has no `useId`) —
               * both correctly. A heading needs neither: the association is structural, the copy
               * exists once, and there is no id. `<ol>` stays unnamed and gains a heading above it,
               * which is what a sighted reader has had all along.
               *
               * Visually identical. `.eyebrow` is in `@layer defaults` and the global
               * `h1…h6 { @include heading-font(); }` is in `@layer global`, which `defaults` beats
               * (`@layer global, defaults` in `AaCSSLayerDefinitions`), and `.eyebrow` already owns
               * family, size, weight, tracking, leading, `margin: 0` and the transform — so there is
               * nothing left for the heading rule to say. Measured on the rendered story, not
               * assumed.
               *
               * h3 because the statement is the h2 this column sits under. The one outline skip it
               * can produce is an aside with no statement — `title` is `required()`, so that is a
               * half-built draft in Presentation and the same state the early return above exists
               * for.
               */}
              {Boolean(asideEyebrow?.trim()) && <h3 className={styles.eyebrow}>{asideEyebrow}</h3>}
              {hasList && (
                /*
                 * `ol` and not `ul`: the ordinals are visible and the order carries meaning —
                 * reordering the list changes what it says, which is the whole test for an ordered
                 * list.
                 *
                 * `role="list"` is not redundant. The global reset sets `list-style-type: none` on
                 * every `ol`, and WebKit strips the `list` role from an unstyled list that does not
                 * claim it back, so VoiceOver would announce these as loose text. Same reasoning as
                 * `components/Footer`, `HeaderDisplaySection` and `ScheduleSection`.
                 *
                 * Deliberately **not** named with `aria-label`. `asideEyebrow` is the visible label
                 * for exactly this list, but duplicating CMS copy into the accessibility tree makes
                 * it drift the moment an editor renames one and not the other; `aria-labelledby`
                 * needs a page-unique id, and this is a server component with no `useId`, so the id
                 * would have to come from content that is not unique across two instances of the
                 * section on one page. `ScheduleSection` records the same trade at length.
                 */
                <ol className={styles.list} role="list">
                  {listItems.map(({ key, text }, index) => (
                    /*
                     * Keyed by the item's text rather than its index, and carried on the item rather
                     * than read off it — see the note where `listItems` is built for why a
                     * `Rule.unique()` a draft can violate is not enough on its own.
                     */
                    <li className={styles.item} key={key}>
                      {/*
                       * `aria-hidden`, and this is the reason the ordinal is a real element rather
                       * than a CSS counter.
                       *
                       * The `<ol role="list">` above already gives a screen reader the position —
                       * "1 of 4" from `posinset` — so a spoken "01" is the same fact twice. A
                       * `content: counter(…)` pseudo-element *is* exposed in the accessibility tree
                       * by the CSSOM-AAM mapping and announced by NVDA and JAWS, with no attribute
                       * that can suppress it; a real span can take `aria-hidden` and keep the
                       * visible numbering the design draws. `ScheduleSection`'s bracket spans are
                       * the same decision.
                       *
                       * `formatOrdinal` takes the **zero-based** index and returns the one-based,
                       * zero-padded string — so the numbering is a function of array position and an
                       * editor cannot type "03" twice. `MAM-1910` and `MAM-1911` reuse it.
                       */}
                      <span className={styles.ordinal} aria-hidden="true">
                        {formatOrdinal(index)}
                      </span>
                      {/*
                       * `Text` rather than a raw span: the item is body type on the shared scale, so
                       * `size="md"` is `--body-md` = fluid(14px, 16px), which is the design's pair
                       * exactly. `.itemText` re-points only the leading — see the note there.
                       */}
                      <Text className={styles.itemText} as="span" text={text} variant="body" size="md" />
                    </li>
                  ))}
                </ol>
              )}
              {hasCopy && (
                /*
                 * `config.p` reaches both handlers: `TextBlock` maps a Portable Text `normal` block
                 * through `config.span`, which itself spreads `config.p`, so the one override covers
                 * `normal` and `p` alike.
                 *
                 * `size="lg"` keeps the paragraph on the body scale and `styles.copyText` re-points
                 * the two tokens that step reads to the drawn pair; see the note there.
                 */
                <TextBlock blocks={copy} config={{ p: { className: styles.copyText, size: 'lg' } }} />
              )}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
};

export default TwoColumnListSection;
