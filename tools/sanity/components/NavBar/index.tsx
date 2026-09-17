import { Stack } from '@sanity/ui';
import type { NavbarProps } from 'sanity';

import BuildStatus from '../BuildStatus';

import './styles.css';

const NavBar = (props: NavbarProps) => (
  <div id="navbar">
    <Stack>
      <BuildStatus navbar />
      <>{props.renderDefault(props)}</>
    </Stack>
  </div>
);

export default NavBar;
