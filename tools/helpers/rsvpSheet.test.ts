import { describe, expect, it } from 'vitest';

import { RSVP_FIELD } from '@/components/RsvpForm/contract';

import { guestColumnsOf } from './guests';
import { REPLY_COLUMNS, replyCellsOf, replyColumnsIn } from './rsvpSheet';

const REPLY = {
  coming: true,
  dietary: 'Vegetarian',
  email: 'sam@example.com',
  kidsAges: '2 and 5',
  kidsCount: 2,
  name: 'Sam Logan',
  plusOne: { bringing: true, dietary: 'No shellfish', name: 'Alex Lee' },
  songRequest: 'September',
  specialRequirements: 'A cot',
  staying: true
};

describe('REPLY_COLUMNS', () => {
  it('has a column for every answer the form sends', () => {
    expect(REPLY_COLUMNS.map((column) => column.field).toSorted()).toEqual(Object.values(RSVP_FIELD).toSorted());
  });

  it('never takes the place of a guest column the site reads', () => {
    const header = [
      'Guest ID',
      'First name',
      'Last name',
      'Email',
      'RSVP status',
      ...REPLY_COLUMNS.map((c) => c.header)
    ];
    const columns = guestColumnsOf(header);
    expect(columns.email).toBe(3);
    expect(columns.firstName).toBe(1);
    expect(columns.rsvpStatus).toBe(4);
  });
});

describe('replyCellsOf', () => {
  it('writes every answer, in column order', () => {
    expect(replyCellsOf(REPLY)).toEqual([
      'Yes',
      'Sam Logan',
      'sam@example.com',
      'Vegetarian',
      'Yes',
      'Alex Lee',
      'No shellfish',
      '2',
      '2 and 5',
      'A cot',
      'September',
      'Yes',
      ''
    ]);
  });

  it('writes a guest who can’t make it as not coming, with their note', () => {
    const cells = replyCellsOf({
      coming: false,
      email: 'a@b.co',
      kidsCount: 0,
      message: 'Sorry!',
      name: 'A',
      plusOne: { bringing: false },
      staying: false
    });
    expect(cells[0]).toBe('No');
    expect(cells.at(-1)).toBe('Sorry!');
  });

  it('writes blanks for unanswered questions, and a reply from before the staying question as staying', () => {
    const cells = replyCellsOf({ email: 'a@b.co', kidsCount: 0, name: 'A', plusOne: { bringing: false } });
    expect(cells).toEqual(['Yes', 'A', 'a@b.co', '', 'No', '', '', '0', '', '', '', 'Yes', '']);
  });
});

describe('replyColumnsIn', () => {
  it('adds every reply column after the last header when the sheet has none', () => {
    const { add, indexes } = replyColumnsIn(['Guest ID', 'First name']);
    expect(indexes).toEqual(REPLY_COLUMNS.map((_, index) => 2 + index));
    expect(add[0]).toEqual({ header: 'Reply: Coming', index: 2 });
    expect(add).toHaveLength(REPLY_COLUMNS.length);
  });

  it('finds the columns it already added, wherever they were moved, and adds only the missing', () => {
    const header = ['Guest ID', ' reply: email ', 'Reply: Name'];
    const { add, indexes } = replyColumnsIn(header);
    // Coming (missing, so added at 3), then Name at 2 and Email at 1, as they already are.
    expect(indexes.slice(0, 3)).toEqual([3, 2, 1]);
    expect(add.map((column) => column.header)).not.toContain('Reply: Name');
    expect(add[0]).toEqual({ header: 'Reply: Coming', index: 3 });
    expect(add[1]).toEqual({ header: 'Reply: Dietary', index: 4 });
  });
});

describe('the rsvp document in Sanity', () => {
  it('has a field for every answer the form sends, dotted names included', async () => {
    const { default: rsvp } = await import('@/tools/sanity/schema/documents/rsvp');
    interface SchemaField {
      name: string;
      fields?: SchemaField[];
    }
    const paths = (rsvp.fields as SchemaField[]).flatMap((field) => [
      field.name,
      ...(field.fields ?? []).map((child) => `${field.name}.${child.name}`)
    ]);
    for (const name of Object.values(RSVP_FIELD)) {
      expect(paths).toContain(name);
    }
  });
});
