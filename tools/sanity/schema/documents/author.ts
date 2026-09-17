import { defineType } from 'sanity';

interface IAuthorDocument {
  firstName: string;
  lastName: string;
  role: string;
  image: SanityImage;
}

const author = defineType({
  fields: [
    {
      fieldset: 'name',
      name: 'firstName',
      title: 'First Name',
      type: 'string'
    },
    {
      fieldset: 'name',
      name: 'lastName',
      title: 'Last Name',
      type: 'string'
    },
    {
      name: 'role',
      title: 'Role',
      type: 'string'
    },
    {
      name: 'image',
      title: 'Image',
      type: 'imageElementSimple',
      validation: (Rule) => Rule.required()
    }
  ],
  fieldsets: [
    {
      name: 'name',
      options: { columns: 2 },
      title: 'Name'
    }
  ],
  name: `author`,
  preview: {
    prepare(selection) {
      const { firstName, lastName, subtitle, image } = selection;
      return {
        media: image?.image || null,
        subtitle,
        title: `${firstName || ''} ${lastName || ''}`
      };
    },
    select: {
      firstName: 'firstName',
      image: 'image',
      lastName: 'lastName',
      subtitle: 'role'
    }
  },
  title: `Author`,
  type: `document`
});

export default author;
export type { IAuthorDocument };
