import { describe, expect, it } from 'vitest';

import { paragraphsOf, thankYouVariables } from './thankYouEmail';

const block = (text: string, listItem?: string): SanityTextBlock => ({
  _key: text,
  _type: 'block',
  children: [{ _key: 'a', _type: 'span', text }],
  markDefs: [],
  style: 'normal',
  ...(listItem ? { level: 1, listItem } : {})
});

const BASE = { firstName: 'Sam', homeLink: 'https://samandlauren.wedding/g/SAM-1/?to=/' };

describe('paragraphsOf', () => {
  it('turns rich text into one plain paragraph per block, lists bulleted', () => {
    expect(paragraphsOf([block('Account name: Sam & Lauren'), block('BSB 062 000', 'bullet')])).toEqual([
      'Account name: Sam & Lauren',
      '• BSB 062 000'
    ]);
  });

  it('drops empty blocks and anything that is not text', () => {
    const image = { ...block(''), _type: 'blockContentImage' };
    expect(paragraphsOf([block('  '), image, block('Kept')])).toEqual(['Kept']);
    expect(paragraphsOf(undefined)).toEqual([]);
    expect(paragraphsOf(null)).toEqual([]);
  });

  it('keeps a line break inside a block', () => {
    expect(paragraphsOf([block('BSB 062 000\nAccount 1234 5678')])).toEqual(['BSB 062 000\nAccount 1234 5678']);
  });
});

describe('thankYouVariables', () => {
  it('gives the stay one line and the total, with the Sunday night named when taken', () => {
    const stay = { extraNight: true, nights: 3, perNight: 150, stay: 'King Room', total: 450 };
    expect(thankYouVariables({ ...BASE, stay }).stay).toEqual([
      { summary: 'King Room · 3 nights, Sunday included', total: '$450' }
    ]);
  });

  it('leaves out every part the guest has nothing for — heading and all', () => {
    expect(thankYouVariables(BASE)).toEqual({
      ...BASE,
      payment: [],
      paymentHeading: [],
      stay: [],
      travel: [],
      travelHeading: []
    });
  });

  it('shows the payment details and the travel note under their headings', () => {
    const variables = thankYouVariables({
      ...BASE,
      payment: [block('Wise: sam@example.com')],
      travel: { content: [block('You will need an ETA.')], title: 'Travelling from the UK' }
    });
    expect(variables.paymentHeading).toEqual([{ text: 'How to pay' }]);
    expect(variables.payment).toEqual([{ text: 'Wise: sam@example.com' }]);
    expect(variables.travelHeading).toEqual([{ text: 'Travelling from the UK' }]);
    expect(variables.travel).toEqual([{ text: 'You will need an ETA.' }]);
  });

  it('heads an untitled travel note "Travel tips"', () => {
    expect(thankYouVariables({ ...BASE, travel: { content: [block('Bring a hat.')] } }).travelHeading).toEqual([
      { text: 'Travel tips' }
    ]);
  });
});
