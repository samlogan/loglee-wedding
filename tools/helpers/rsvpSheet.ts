import { RSVP_FIELD } from '@/components/RsvpForm/contract';
import type { RsvpFieldName } from '@/components/RsvpForm/contract';
import type { IRsvpDocument } from '@/tools/sanity/schema/documents/rsvp';

/*=============================================>>>>>
= A guest's RSVP answers, in their row of the guest sheet =
===============================================>>>>>*/

/** What a reply carries — the `rsvp` document less what Sanity and the server add. */
type Reply = Pick<
  IRsvpDocument,
  | 'name'
  | 'email'
  | 'dietary'
  | 'plusOne'
  | 'kidsCount'
  | 'kidsAges'
  | 'specialRequirements'
  | 'songRequest'
  | 'staying'
  | 'extraNight'
>;

const yesNo = (value: boolean | undefined) => (value ? 'Yes' : 'No');

/**
 * One column per answer on the RSVP form, in the form's order, each keyed by the name the control
 * submits under. The headers all start "Reply:", which no guest column (`GUEST_COLUMNS`) starts
 * with, so adding them can never be mistaken for the guest's own Email or Name.
 *
 * Every field on the form must be here — `rsvpSheet.test.ts` fails when one is added without a
 * column, so a new question cannot reach Sanity and quietly miss the sheet.
 */
export const REPLY_COLUMNS: { field: RsvpFieldName; header: string; value: (reply: Reply) => string }[] = [
  { field: RSVP_FIELD.name, header: 'Reply: Name', value: (reply) => reply.name },
  { field: RSVP_FIELD.email, header: 'Reply: Email', value: (reply) => reply.email },
  { field: RSVP_FIELD.dietary, header: 'Reply: Dietary', value: (reply) => reply.dietary ?? '' },
  {
    field: RSVP_FIELD.plusOneBringing,
    header: 'Reply: Plus one',
    value: (reply) => yesNo(reply.plusOne?.bringing)
  },
  { field: RSVP_FIELD.plusOneName, header: 'Reply: Plus one name', value: (reply) => reply.plusOne?.name ?? '' },
  {
    field: RSVP_FIELD.plusOneDietary,
    header: 'Reply: Plus one dietary',
    value: (reply) => reply.plusOne?.dietary ?? ''
  },
  { field: RSVP_FIELD.kidsCount, header: 'Reply: Kids', value: (reply) => String(reply.kidsCount ?? 0) },
  { field: RSVP_FIELD.kidsAges, header: 'Reply: Kids’ ages', value: (reply) => reply.kidsAges ?? '' },
  {
    field: RSVP_FIELD.specialRequirements,
    header: 'Reply: Special requirements',
    value: (reply) => reply.specialRequirements ?? ''
  },
  { field: RSVP_FIELD.songRequest, header: 'Reply: Song request', value: (reply) => reply.songRequest ?? '' },
  // Replies from before the form asked were all staying.
  { field: RSVP_FIELD.staying, header: 'Reply: Staying', value: (reply) => yesNo(reply.staying !== false) },
  { field: RSVP_FIELD.extraNight, header: 'Reply: Sunday night', value: (reply) => yesNo(reply.extraNight) }
];

const normalise = (header: string) => header.trim().toLowerCase();

/**
 * Where each reply column is in the header row, adding any that are missing at the end, in order.
 * `add` lists the headers to write into row 1 — `[]` once the sheet has them all.
 */
export const replyColumnsIn = (header: readonly string[]) => {
  const labels = header.map(normalise);
  const add: { index: number; header: string }[] = [];
  const indexes = REPLY_COLUMNS.map((column) => {
    const found = labels.indexOf(normalise(column.header));
    if (found !== -1) {
      return found;
    }
    const index = header.length + add.length;
    add.push({ header: column.header, index });
    return index;
  });
  return { add, indexes };
};

/** The reply's answers as sheet cells, in `REPLY_COLUMNS` order. */
export const replyCellsOf = (reply: Reply): string[] => REPLY_COLUMNS.map((column) => column.value(reply));
