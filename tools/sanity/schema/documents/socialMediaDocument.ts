import type { ComponentType } from 'react';
import {
  TbBrandFacebook,
  TbBrandX,
  TbBrandLinkedin,
  TbBrandInstagram,
  TbBrandYoutube,
  TbMoodSmile
} from 'react-icons/tb';
import { defineType } from 'sanity';

const socialMediaItem = defineType({
  fields: [
    {
      description: 'If your desired social media platform is not listed, please contact your developer.',
      name: 'name',
      options: {
        list: [
          { title: 'Facebook', value: 'facebook' },
          { title: 'X (Twitter)', value: 'x' },
          { title: 'LinkedIn', value: 'linkedin' },
          { title: 'Instagram', value: 'instagram' },
          { title: 'YouTube', value: 'youtube' }
        ]
      },
      title: 'Name',
      type: 'string'
    },
    {
      description: 'Link to social media page',
      name: 'link',
      title: 'Link',
      type: 'url'
    }
  ],
  name: 'socialMediaItem',
  preview: {
    prepare(selection) {
      const icons: Record<string, ComponentType> = {
        facebook: TbBrandFacebook,
        instagram: TbBrandInstagram,
        linkedin: TbBrandLinkedin,
        no_platform_selected: TbMoodSmile,
        x: TbBrandX,
        youtube: TbBrandYoutube
      };
      const title = selection.title || 'no_platform_selected';
      const subtitle = selection.subtitle || '';
      return {
        media: icons[title] || TbMoodSmile,
        subtitle,
        title: title.charAt(0).toUpperCase() + title.slice(1)
      };
    },
    select: {
      subtitle: 'link',
      title: 'name'
    }
  },
  title: 'Social Media Item',
  type: 'object'
});

const socialMediaDocument = defineType({
  fields: [
    {
      name: 'socials',
      of: [{ type: 'socialMediaItem' }],
      title: 'Socials',
      type: 'array'
    }
  ],
  name: `socialMediaDocument`,
  preview: {
    prepare() {
      return {
        title: 'Social Media'
      };
    }
  },
  title: `Social Media`,
  type: `document`
});

export { socialMediaDocument, socialMediaItem };
