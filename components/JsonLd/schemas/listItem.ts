import type { ListItem } from 'schema-dts';

interface ListItemProps {
  position: number;
  name: string | undefined;
  item: string;
}

const listItem = (props: ListItemProps): ListItem => {
  const { position, name, item } = props;
  return {
    '@type': 'ListItem',
    item: item,
    name: name,
    position: position
  };
};

export default listItem;
