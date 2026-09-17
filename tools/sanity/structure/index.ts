import type { StructureResolver } from 'sanity/structure';

import BlogMenuItem from './blog';
import GlobalMenuItem from './global';
import PageMenuItem from './pages';
import RoutesMenuItem from './routes';
import SettingsMenuItem from './settings';
import WeddingSettingsMenuItem from './weddingSettings';

const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      PageMenuItem(S),
      BlogMenuItem(S),
      S.divider(),
      WeddingSettingsMenuItem(S),
      GlobalMenuItem(S),
      S.divider(),
      SettingsMenuItem(S),
      ...RoutesMenuItem(S)
    ]);

export default structure;
