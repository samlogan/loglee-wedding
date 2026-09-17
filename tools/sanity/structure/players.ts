import { TbDeviceGamepad2 } from 'react-icons/tb';
import type { StructureBuilder } from 'sanity/structure';

const PlayersMenuItem = (S: StructureBuilder) =>
  S.listItem()
    .title('Players')
    .icon(TbDeviceGamepad2)
    .child(() =>
      S.documentTypeList('player')
        .title('Players')
        .defaultOrdering([{ direction: 'asc', field: 'order' }])
        .menuItems(S.documentTypeList('player').getMenuItems())
    );

export default PlayersMenuItem;
