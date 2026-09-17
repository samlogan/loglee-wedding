import * as icons from '@/assets/icons';
import { toTitleCase } from '@/helpers/string';

const options = Object.keys(icons).map((key) => ({
  title: toTitleCase(key),
  value: key
}));

const icon = {
  name: 'icon',
  options: {
    layout: 'dropdown' as const,
    list: options
  },
  title: 'Icon',
  type: 'string'
};

export default icon;
