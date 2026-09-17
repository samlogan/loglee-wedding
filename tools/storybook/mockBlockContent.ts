type ParagraphInput = string | { text: string; marks?: string[] }[];

let keyCounter = 0;
const nextKey = (prefix: string) => `${prefix}-${++keyCounter}`;

const toChildren = (input: ParagraphInput): SanityTextBlockChild[] => {
  if (typeof input === 'string') {
    return [{ _key: nextKey('span'), _type: 'span', text: input, marks: [] }];
  }
  return input.map((part) => ({
    _key: nextKey('span'),
    _type: 'span',
    text: part.text,
    marks: part.marks ?? []
  }));
};

const block = (style: string, input: ParagraphInput): SanityTextBlock => ({
  _key: nextKey('block'),
  _type: 'block',
  style,
  markDefs: [],
  children: toChildren(input)
});

const SHORT_PARAGRAPHS = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
];

const MEDIUM_PARAGRAPHS = [
  ...SHORT_PARAGRAPHS,
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'
];

const LONG_PARAGRAPHS = [
  ...MEDIUM_PARAGRAPHS,
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra.',
  'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.'
];

const mockBlockContent = (size: 'sm' | 'md' | 'lg' = 'md'): SanityTextBlock[] => {
  const paragraphs = size === 'sm' ? SHORT_PARAGRAPHS : size === 'lg' ? LONG_PARAGRAPHS : MEDIUM_PARAGRAPHS;
  return paragraphs.map((text) => block('normal', text));
};

export default mockBlockContent;
export { block as mockBlock };
