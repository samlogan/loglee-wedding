import { defineType } from 'sanity';
import slugify from 'slugify';

import SlugInput from '../../components/SlugInput';
import { client } from '../../lib/client';

const slugElement = defineType({
  components: {
    input: SlugInput
  },
  description:
    'Please ensure forward slash / is added to beginning and end of url or to nest pages e.g. /example-page/ or /example-page/new-page/',
  name: 'slugElement',
  options: {
    slugify: (input) => `/${slugify(input, { lower: true, strict: true })}/`,
    source: `title`
  },
  title: 'Slug',
  type: 'slug',
  validation: (Rule) =>
    Rule.custom(async (slug, { document, type, ...rest }) => {
      const currentSlug = slug?.current;
      // const currentPathname = document?.pathname;
      // Construct currentPathname instead, in case document?.pathname still hasn't been set (first creation)
      const currentPathname = type?.options?.prefix ? `${type.options.prefix}${currentSlug}` : currentSlug;
      const currentDocumentId = document?._id;

      if (currentPathname !== document?.pathname) {
        return 'Slug needs to be saved. Click anywhere to save.';
      }

      if (currentPathname && currentDocumentId) {
        const allPathnames = await client.fetch<{ _type: string; _id: string; pathname: string }[]>(
          `*[_type in $types && !(_id in path("drafts.**"))]{ _type, _id, pathname }`,
          { types: ['page'] }
        );

        const isNotUnique = allPathnames.find(
          (pathnameItem) =>
            pathnameItem?._id !== currentDocumentId.replace(/^drafts\./, '') &&
            pathnameItem?.pathname === currentPathname
        );

        if (isNotUnique) {
          return 'Slug is already in use';
        }
      }

      if (currentSlug === undefined) {
        return 'Required';
      }
      if (!currentSlug?.match(/^[a-z0-9/]+(?:-[a-z0-9/]+)*$/g)) {
        return 'Please format URL to be valid slug.';
      }
      if (currentSlug?.[0] !== '/') {
        return 'Please add initial forward slash.';
      }
      if (currentSlug.at(-1) !== '/') {
        return 'Please add trailing forward slash.';
      }
      return true;
    })
});

export default slugElement;
