import { MdLink } from 'react-icons/md';
import { TbAlignCenter } from 'react-icons/tb';
import { defineType } from 'sanity';

import { CenterTextComponent } from '../../components/BlockComponents';
import { linkElementFields } from '../elements/link';

const blockContentSimple = defineType({
  name: 'blockContentSimple',
  of: [
    {
      lists: [],
      marks: {
        annotations: [
          {
            title: 'Link',
            name: 'link',
            icon: MdLink,
            type: 'object',
            fields: linkElementFields
          }
        ],
        decorators: [
          { title: 'Strong', value: 'strong' },
          { title: 'Emphasis', value: 'em' },
          { title: 'Underline', value: 'underline' }
        ]
      },
      styles: [{ title: 'Normal', value: 'normal' }],
      title: 'Block',
      type: 'block'
    }
  ],
  title: 'Block Content',
  type: 'array'
});

const blockContentStandard = defineType({
  name: 'blockContentStandard',
  of: [
    {
      lists: [
        { title: 'Bullet List', value: 'bullet' },
        { title: 'Numbered List', value: 'number' }
      ],
      marks: {
        annotations: [
          {
            title: 'Link',
            name: 'link',
            icon: MdLink,
            type: 'object',
            fields: linkElementFields
          }
        ],
        decorators: [
          { title: 'Strong', value: 'strong' },
          { title: 'Emphasis', value: 'em' },
          { title: 'Underline', value: 'underline' }
        ]
      },
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'H1', value: 'h1' },
        { title: 'H2', value: 'h2' },
        { title: 'H3', value: 'h3' },
        { title: 'H4', value: 'h4' },
        { title: 'H5', value: 'h5' },
        { title: 'H6', value: 'h6' }
      ],
      title: 'Block',
      type: 'block'
    }
  ],
  title: 'Block Content',
  type: 'array'
});

const blockContentAdvanced = defineType({
  name: 'blockContentAdvanced',
  of: [
    {
      lists: [
        { title: 'Bullet List', value: 'bullet' },
        { title: 'Numbered List', value: 'number' }
      ],
      marks: {
        annotations: [
          {
            title: 'Link',
            name: 'link',
            icon: MdLink,
            type: 'object',
            fields: linkElementFields
          }
        ],
        decorators: [
          { title: 'Strong', value: 'strong' },
          { title: 'Emphasis', value: 'em' },
          { title: 'Underline', value: 'underline' },
          {
            title: 'Center Align Text',
            value: 'centerAlignText',
            icon: TbAlignCenter,
            component: CenterTextComponent
          }
        ]
      },
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'H1', value: 'h1' },
        { title: 'H2', value: 'h2' },
        { title: 'H3', value: 'h3' },
        { title: 'H4', value: 'h4' },
        { title: 'H5', value: 'h5' },
        { title: 'H6', value: 'h6' }
      ],
      title: 'Block',
      type: 'block'
    },
    {
      name: 'divider',
      type: 'divider'
    },
    {
      name: 'blockContentImage',
      title: 'Image',
      type: 'blockContentImage'
    },
    {
      name: 'blockContentVideo',
      title: 'Video',
      type: 'blockContentVideo'
    },
    {
      name: 'blockContentButtons',
      title: 'Buttons',
      type: 'blockContentButtons'
    }
  ],
  title: 'Block Content',
  type: 'array'
});

const blockContentImage = defineType({
  fields: [
    {
      name: 'image',
      title: 'Image',
      type: 'imageElementSimple'
    },
    {
      name: 'caption',
      title: 'Caption',
      type: 'string'
    }
  ],
  name: 'blockContentImage',
  preview: {
    prepare({ caption, image, altText }) {
      return {
        media: image,
        title: caption || altText || 'No caption'
      };
    },
    select: {
      altText: 'image.altText',
      caption: 'caption',
      image: 'image.image'
    }
  },
  title: 'Image',
  type: 'object'
});

const blockContentVideo = defineType({
  fields: [
    {
      name: `videoUrl`,
      placeholder: `https://...`,
      title: `Video URL (Vimeo, YouTube, etc.)`,
      type: `url`
    }
  ],
  name: 'blockContentVideo',
  preview: {
    prepare({ title }) {
      return { title };
    },
    select: {
      title: 'videoUrl'
    }
  },
  title: 'Video',
  type: 'object'
});

const blockContentButtons = defineType({
  fields: [
    {
      name: 'buttons',
      of: [
        {
          title: 'Button',
          type: 'buttonElement'
        }
      ],
      title: 'Buttons',
      type: 'array'
    }
  ],
  name: 'blockContentButtons',
  preview: {
    prepare({ buttons }) {
      return {
        title: buttons?.length ? `${buttons.length} button${buttons.length > 1 ? 's' : ''}` : 'No buttons added'
      };
    },
    select: {
      buttons: 'buttons'
    }
  },
  title: 'Buttons',
  type: 'object'
});

export {
  blockContentSimple,
  blockContentStandard,
  blockContentAdvanced,
  blockContentImage,
  blockContentVideo,
  blockContentButtons
};
