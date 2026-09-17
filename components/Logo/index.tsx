import { createElement } from 'react';

import logo from '@/assets/logo/logo.svg';
import Link from '@/components/Link';
import metadata from '@/config/metadata';
import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

interface LogoProps {
  className?: string;
}

const Logo = (props: LogoProps) => {
  const { className } = props;

  const classes = classNames(styles.logo, className);

  if (!logo) {
    return null;
  }

  return (
    <Link className={classes} href="/" title={`${metadata?.title}` || 'Home'}>
      {createElement(logo)}
    </Link>
  );
};

export default Logo;
