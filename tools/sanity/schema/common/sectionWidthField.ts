import type { FieldDefinition } from 'sanity';

type SectionWidth = 'full' | 'contained';

interface ISectionWidthField {
  width?: SectionWidth | null;
}

/**
 * Edge to edge of the viewport, or inside the page container like the sections around it — for the
 * sections whose content is a single frame (a map, a photo, a video). Full width is the default.
 *
 * Read with `isContained` rather than compared by hand, so a stega-encoded draft value and an unset
 * one both behave.
 */
const sectionWidthField: FieldDefinition = {
  description:
    'Full width runs edge to edge of the screen. Contained sits inside the page margins, like the text around it.',
  group: 'styles',
  initialValue: 'full',
  name: 'width',
  options: {
    direction: 'horizontal',
    layout: 'radio',
    list: [
      { title: 'Full width', value: 'full' },
      { title: 'Contained', value: 'contained' }
    ]
  },
  title: 'Width',
  type: 'string'
};

export default sectionWidthField;
export type { ISectionWidthField, SectionWidth };
