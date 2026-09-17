import { TbHeart } from 'react-icons/tb';
import type { StructureBuilder } from 'sanity/structure';

const WeddingSettingsMenuItem = (S: StructureBuilder) =>
  S.listItem()
    .title('Wedding Settings')
    .child(S.document().schemaType('weddingSettings').documentId('weddingSettings'))
    .icon(TbHeart);

export default WeddingSettingsMenuItem;
