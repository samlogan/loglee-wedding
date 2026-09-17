import { LuCodeXml } from 'react-icons/lu';
import { defineType } from 'sanity';

import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
// import thumbnail from '../../../../sections/EmbedSection/thumbnail.png';

interface IEmbedSection {
  /** A URL to embed. Rendered in a sandboxed iframe — see the component for why not raw HTML. */
  embed: string;
}

const embedSection = defineType({
  fields: [
    internalLabelField,
    {
      name: 'sectionPreview',
      title: 'Section Preview',
      type: 'image',
      components: { input: ReadOnlyImageInput },
      // imageUrl: thumbnail.src,
      readOnly: true,
      group: 'internal'
    },
    {
      group: 'data',
      name: 'embed',
      title: 'Add embed link',
      type: 'text'
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: LuCodeXml,
  name: 'embedSection',
  preview: {
    prepare() {
      return {
        title: `Embed Section`
      };
    }
  },
  title: 'Embed Section',
  type: 'object'
});

export default embedSection;
export type { IEmbedSection };
