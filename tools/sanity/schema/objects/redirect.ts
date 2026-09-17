import { defineType } from 'sanity';

const redirect = defineType({
  fields: [
    {
      description: 'Enter a valid relative url (/path/).',
      name: 'source',
      title: 'Source',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((self) => {
          if (!self || typeof self !== 'string') {
            // If the source is empty or not a string, return an error message
            return 'Source must be a relative URL (/path).';
          }

          // Use regular expression to check if the source is a relative URL
          const relativeUrlRegex = /^\/([^/]+\/)*[^/]+\/?$/;
          if (!relativeUrlRegex.test(self)) {
            // If the source is not a relative URL, return an error message
            return 'Source must be a relative URL (/path).';
          }

          // Return true if the source is valid
          return true;
        })
    },
    {
      description: 'Enter a valid absolute url (https://...).',
      name: 'destination',
      title: 'Destination',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((self) => {
          if (!self || typeof self !== 'string') {
            // If the source is empty or not a string, return an error message
            return 'Destination must be a validate absolute URL (https://...).';
          }

          // Use regular expression to check if the source is an absolute URL
          const absoluteUrlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w]+(\/[\w-./?%&=]*)?$/;
          if (!absoluteUrlRegex.test(self)) {
            // If the source is not an absolute URL, return an error message
            return 'Destination must be a validate absolute URL (https://...).';
          }

          // Return true if the source is valid
          return true;
        })
    },
    {
      description: 'Choose whether the redirect is permanent (308) or temporary (307).',
      initialValue: true,
      name: 'permanent',
      title: 'Permanent Redirect (308)',
      type: 'boolean'
    }
  ],
  name: 'redirect',
  preview: {
    prepare({ source, destination, permanent }) {
      return {
        title: `${permanent ? '[308]:' : '[307]:'} ${source} → ${destination}`
      };
    },
    select: {
      destination: 'destination',
      permanent: 'permanent',
      source: 'source'
    }
  },
  type: 'object'
});

export default redirect;
