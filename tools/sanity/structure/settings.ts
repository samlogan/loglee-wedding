import { TbSettings } from 'react-icons/tb';
import type { StructureBuilder } from 'sanity/structure';

const SettingsMenuItem = (S: StructureBuilder) =>
  S.listItem().title('Settings').child(S.document().schemaType('settings').documentId('settings')).icon(TbSettings);

export default SettingsMenuItem;
