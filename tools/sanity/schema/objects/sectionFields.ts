import { defineType } from 'sanity';

const sectionFields = defineType({
  fields: [
    {
      name: 'spacingOptions',
      title: 'Spacing Options',
      type: 'spacingOptions'
    },
    {
      name: 'themeOptions',
      title: 'Theme Options',
      type: 'themeOptions'
    }
  ],
  name: 'sectionFields',
  title: 'Section Fields',
  type: 'object'
});

const spacingOptions = defineType({
  fields: [
    {
      name: 'removeTopSpacing',
      title: 'Remove Top Spacing',
      type: 'boolean'
    },
    {
      name: 'removeBottomSpacing',
      title: 'Remove Bottom Spacing',
      type: 'boolean'
    }
  ],
  initialValue: {
    removeBottomSpacing: false,
    removeTopSpacing: false
  },
  name: 'spacingOptions',
  options: {
    collapsed: false
  },
  title: 'Spacing Options',
  type: 'object'
});

// try to use me for most if you need a one-off section specific theme define it in the section
const themeOptions = defineType({
  fields: [
    {
      name: 'theme',
      options: {
        direction: 'horizontal' as const,
        layout: 'radio' as const,
        list: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'primary', title: 'Primary' },
          { value: 'secondary', title: 'Secondary' },
          { value: 'tertiary', title: 'Tertiary' }
        ]
      },
      title: 'Theme',
      type: 'string'
    }
  ],
  name: 'themeOptions',
  title: 'Theme Options',
  type: 'object'
});

export { sectionFields, spacingOptions, themeOptions };
