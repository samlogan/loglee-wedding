import { defineType } from 'sanity';

const imageElementAdvanced = defineType({
  fields: [
    {
      description: 'Important for SEO and accessibility',
      initialValue: process.env.NEXT_PUBLIC_SANITY_PROJECT_NAME,
      name: `altText`,
      title: 'Alt Text',
      type: 'string'
    },
    {
      name: 'aspectRatio',
      title: 'Aspect Ratio',
      type: 'string',
      description: 'Select the aspect ratio. Will default to natural aspect unless specified.',
      fieldset: 'advanced', // Associate this field with the 'advanced' fieldset
      initialValue: 'naturalAspect',
      options: {
        direction: 'horizontal',
        layout: 'radio',
        list: [
          { title: 'Natural Aspect', value: 'natural' },
          { title: '1:1', value: '1-1' },
          { title: '4:3', value: '4-3' },
          { title: '16:9', value: '16-9' },
          { title: '21:9', value: '21-9' }
        ]
      }
    }
  ],
  fieldsets: [
    {
      name: 'advanced',
      options: { collapsed: true, collapsible: true, modal: { type: 'dialog' } },
      title: 'Advanced' // This makes the fieldset collapsible and collapsed by default
    }
  ],
  name: `imageElementAdvanced`,
  options: {
    hotspot: true
  },
  preview: {
    prepare({ title, media }) {
      return {
        media: media,
        title: title || 'Image'
      };
    },
    select: {
      media: 'asset',
      title: 'altText'
    }
  },
  title: `Image`,
  type: `image`
});

const imageElementSimple = defineType({
  fields: [
    {
      initialValue: process.env.NEXT_PUBLIC_SANITY_PROJECT_NAME,
      name: `altText`,
      title: 'Alt Text',
      type: 'string'
    }
  ],
  name: `imageElementSimple`,
  options: {
    hotspot: true
  },
  preview: {
    prepare({ title, media }) {
      return {
        media: media,
        title: title || 'Image'
      };
    },
    select: {
      media: 'asset',
      title: 'altText'
    }
  },
  title: `Image`,
  type: `image`
});

export { imageElementAdvanced, imageElementSimple };
