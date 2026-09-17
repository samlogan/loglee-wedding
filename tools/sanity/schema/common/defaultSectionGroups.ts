import { FiDatabase } from 'react-icons/fi';
import { TbPaint, TbDoor } from 'react-icons/tb';

const defaultSectionGroups = [
  {
    default: true,
    icon: FiDatabase,
    name: 'data',
    title: 'Data'
  },
  {
    icon: TbPaint,
    name: 'styles',
    title: 'Styles'
  },
  {
    icon: TbDoor,
    name: 'internal',
    title: 'Internal'
  }
];

export default defaultSectionGroups;
