import type { StructureResolver } from 'sanity/structure';

import GlobalMenuItem from './global';
import PageMenuItem from './pages';
import PlayersMenuItem from './players';
import RoutesMenuItem from './routes';
import RsvpsMenuItem from './rsvps';
import SettingsMenuItem from './settings';
import WeddingSettingsMenuItem from './weddingSettings';

const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      PageMenuItem(S),
      S.divider(),
      WeddingSettingsMenuItem(S),
      PlayersMenuItem(S),
      RsvpsMenuItem(S),
      GlobalMenuItem(S),
      S.divider(),
      SettingsMenuItem(S),
      ...RoutesMenuItem(S)
    ]);

export default structure;
