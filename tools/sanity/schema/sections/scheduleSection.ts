import { TbCalendarTime } from 'react-icons/tb';
import { defineType } from 'sanity';
import type { FieldDefinition } from 'sanity';

import thumbnail from '../../../../sections/ScheduleSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import stripTitleTags from '../../helpers/stripTitleTags';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

/**
 * A day-grouped, time-stamped schedule — the three-day weekend running order on `/weekend`.
 *
 * Drawn on Planner (nodes 1:312, 1:348, 1:392 desktop; 1:469, 1:498, 1:537 mobile). The design has
 * no wrapper frame around the three bands: each day is a sibling `HorizontalBorder` at the page
 * level, which is exactly what makes this one section holding an unbounded `days` repeater rather
 * than three sections.
 *
 * ## Two repeaters, nested, both unbounded
 *
 * `days[]` → `events[]`, inline objects rather than documents. Nothing outside this section
 * references a day or an event, and a document type would buy a reference picker nobody needs while
 * costing an editor a second place to look. `faqSection.faqItems` sets the same precedent.
 */
interface IScheduleSectionEvent {
  /*
   * Required here while every sibling is optional, and that asymmetry is an **authoring contract
   * rather than a GROQ guarantee**. Verified against groq-js with a hand-built dataset: an array
   * member created without a `_key` — a script import, a raw mutation — projects `_key: null` at
   * both levels, exactly as the blank fields do. What the type buys is that a story or fixture
   * cannot omit one, which is where the missing key would otherwise first appear; what it cannot
   * do is make the CMS promise one. The Studio always writes one, so the gap is theoretical for
   * hand-authored content and the strict type is the more useful lie.
   */
  _key: string;
  time?: string;
  title?: string;
  description?: SanityTextBlock[];
  location?: string;
}

interface IScheduleSectionDay {
  _key: string;
  eyebrow?: string;
  title?: string;
  date?: string;
  content?: SanityTextBlock[];
  events?: IScheduleSectionEvent[];
}

interface IScheduleSection {
  days?: IScheduleSectionDay[];
}

/*
 * The event's fields, lifted out of the `days` definition purely so the nesting stays readable.
 *
 * Sanity inlines it either way — this is an anonymous object inside `days[].events[]`, not a
 * registered type, so it needs no entry in `schema/index.ts`.
 */
const scheduleEventFields: FieldDefinition[] = [
  /*
   * A single free-text string, not a start/end pair.
   *
   * The design's own values settle it: "from 2pm" sits in the same column as "7pm" and "6:30pm"
   * (nodes 1:330, 1:340, 1:384). A structured pair cannot render "from 2pm" without a third field
   * saying which half is populated and a formatter deciding how to phrase it, and the result would
   * still be a guess at the copy. The source brief asked for start and end datetimes; the design
   * supersedes it.
   *
   * The consequence to accept knowingly: nothing here is machine-readable, so there is no
   * `<time datetime>` and no sorting. Both are fine — the order is the editor's array order, which
   * is the order the design draws, and a wedding schedule is read rather than queried.
   */
  {
    description:
      'The time as you want it read — “7pm”, “6:30pm”, “from 2pm”. Square brackets are added automatically, so do not type them.',
    name: 'time',
    title: 'Time',
    type: 'string',
    validation: (Rule) => Rule.required()
  },
  {
    description: 'What happens. Rendered as a heading beneath the day.',
    name: 'title',
    title: 'Title',
    type: 'string',
    validation: (Rule) => Rule.required()
  },
  /*
   * Named `description` rather than `content`, following `faqSection.answer`: a rich-text field that
   * belongs to a repeater item is named for its role in that item, and `content` is reserved for the
   * body of the thing that owns it — here, the day.
   */
  {
    description: 'One short line beneath the title. Optional — an event with nothing to add omits it.',
    name: 'description',
    title: 'Description',
    type: 'blockContentSimple'
  },
  /*
   * A location, and only a location. The brief specified a per-event dress code; the design does not
   * draw one — the chip on every row is a place ("Reception", "Tree Cathedral", "Firepits") and
   * dress code appears once, as a page-level statement in the closing band (node 1:430). Adding the
   * field "because the brief said so" would put an empty control on every event forever.
   *
   * Capped, and the number is measured rather than a round one picked for tidiness.
   *
   * The chip shares its grid row with the time and is sized from its own content, so a long value
   * takes width from the time gutter before it wraps. At 320px the row has ~216px for it; the
   * design's longest ("Tree Cathedral", 14) uses under half of that, and 40 characters is the point
   * where the chip has taken the whole row and the time column has been squeezed to nothing.
   *
   * `warning()` rather than an error: 40 characters is a legibility threshold, not a data integrity
   * one. `.location`'s `overflow-wrap: anywhere` means a longer value still wraps inside the row
   * rather than escaping it, so the worst case is ugly, and blocking a publish over ugly is the
   * wrong trade for a wedding site an editor updates the week of.
   */
  {
    description:
      'Where it happens — shown as a bordered chip at the right of the row. Type it in normal sentence case; it is displayed in uppercase mono automatically. Keep it to a place name.',
    name: 'location',
    title: 'Location',
    type: 'string',
    validation: (Rule) => Rule.max(40).warning('A place name this long squeezes the time out of the row on a phone.')
  }
];

const scheduleSection = defineType({
  fields: [
    internalLabelField,
    {
      name: 'sectionPreview',
      title: 'Section Preview',
      type: 'image',
      components: { input: ReadOnlyImageInput },
      // @ts-expect-error -- `imageUrl` is read by ReadOnlyImageInput, not by Sanity's image type
      imageUrl: thumbnail.src,
      readOnly: true,
      group: 'internal'
    },
    {
      description: 'One band per day, in the order they should be read. Each band draws its own rule across the page.',
      group: 'data',
      name: 'days',
      of: [
        {
          fields: [
            /*
             * An explicit field rather than a number derived from the array index.
             *
             * Deriving it would keep "Day 01 / 02 / 03" correct through a reorder, which is real —
             * but it also decides, in code, that every band is a numbered day. The design draws
             * three of those; the section is meant to outlive them, and "The night before" or
             * "Friday" are labels an editor should be able to write. The cost is renumbering by
             * hand after a reorder, which is visible in the Studio preview subtitle.
             */
            {
              description:
                'The small label above the day — “Day 01”, “Day 02”. Type it in normal sentence case; it is displayed in uppercase mono automatically.',
              name: 'eyebrow',
              title: 'Eyebrow',
              type: 'string'
            },
            /*
             * Rendered as the band's `<h2>` whatever tag is chosen here, for the same reason
             * `headerDisplaySection` forces `<h1>`: the page's outline is a property of the page,
             * not of whichever control an editor happened to click. `defaultTag` at least opens the
             * selector on the tag that will actually be used.
             */
            {
              description:
                'The oversized day heading — the design abbreviates it (“Fri”, “Sat”, “Sun”). Always rendered as an <h2> in the display type scale; the level selector beside this field does not change that.',
              name: 'title',
              options: { defaultTag: 'h2' as const },
              title: 'Day',
              type: 'title',
              /*
               * The same two-part guard `headerDisplaySection.title` carries. `TitleInput` unsets an
               * emptied field, so `required()` covers the blank case — but a single space is stored
               * as `<h2> </h2>`, which `required()` reads as a non-empty string while `TextTitle`
               * renders an empty heading. Stripping the tags before testing catches it.
               */
              validation: (Rule) =>
                Rule.required().custom((value?: string) =>
                  stripTitleTags(value ?? '').trim() ? true : 'Day cannot be blank'
                )
            },
            /*
             * Free text, not a `date`.
             *
             * A real date type would give `<time datetime>` and a formatter, and it would also fix
             * the phrasing in code — an editor could not write "Friday 12 February" or "12 Feb
             * 2027 (public holiday)". The sibling `time` field is free text for the same reason the
             * ticket gives, and a section whose two temporal fields disagree about how structured
             * they are is worse than one that is consistently loose.
             */
            {
              description: 'The full date line beneath the heading — “12 February 2027”.',
              name: 'date',
              title: 'Date',
              type: 'string'
            },
            /*
             * `content`, per the field-naming rule in CLAUDE.md for a rich-text body, matching
             * `headerDisplaySection` and `faqSection`. The Studio title says "Intro" so an editor
             * sees the role rather than the convention.
             */
            {
              description: 'A short intro for the day, shown beneath the date.',
              name: 'content',
              title: 'Intro',
              type: 'blockContentSimple'
            },
            {
              description:
                'The rows for this day, in order. A day with none is allowed — the band renders its summary alone.',
              name: 'events',
              of: [
                {
                  fields: scheduleEventFields,
                  name: 'scheduleEvent',
                  preview: {
                    prepare(selection: { location?: string; time?: string; title?: string }) {
                      return {
                        subtitle: [selection?.time && `[${selection.time}]`, selection?.location]
                          .filter(Boolean)
                          .join(' · '),
                        title: selection?.title || 'Event'
                      };
                    },
                    select: { location: 'location', time: 'time', title: 'title' }
                  },
                  title: 'Event',
                  type: 'object'
                }
              ],
              title: 'Events',
              type: 'array'
            }
          ],
          name: 'scheduleDay',
          preview: {
            prepare(selection: { date?: string; eyebrow?: string; title?: string }) {
              return {
                subtitle: [selection?.eyebrow, selection?.date].filter(Boolean).join(' · '),
                title: stripTitleTags(selection?.title) || 'Day'
              };
            },
            select: { date: 'date', eyebrow: 'eyebrow', title: 'title' }
          },
          title: 'Day',
          type: 'object'
        }
      ],
      title: 'Days',
      type: 'array',
      /*
       * `min(1)` and not just `required()`. The component returns `null` for an empty `days`, so a
       * section with none renders nothing at all — which is the right runtime behaviour and a
       * confusing authoring experience unless the Studio says so while the page is being built.
       */
      validation: (Rule) => Rule.required().min(1)
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbCalendarTime,
  name: 'scheduleSection',
  preview: {
    prepare(selection: { days?: { _key: string }[]; internalLabel?: string }) {
      const count = selection?.days?.length ?? 0;
      return {
        subtitle: selection?.internalLabel || `${count} day${count === 1 ? '' : 's'}`,
        title: 'Schedule'
      };
    },
    select: {
      days: 'days',
      internalLabel: 'internalLabel'
    }
  },
  title: 'Schedule',
  type: 'object'
});

export { scheduleSection };
export type { IScheduleSection, IScheduleSectionDay, IScheduleSectionEvent };
