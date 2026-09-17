'use client';

import { usePathname } from 'next/navigation';

import Logo from '@/components/Logo';
import classNames from '@/helpers/classNames';
import type { IFooterDocument } from '@/tools/sanity/schema/documents/footerDocument';

import Container from '../Container';
import Socials from '../Socials';

import styles from './styles.module.scss';

interface FooterProps extends IFooterDocument {
  className?: string;
  socials?: {
    _key: string;
    name: string;
    link: string;
  }[];
}

const Footer = (props: FooterProps) => {
  const { footer, socials, className } = props;
  const classes = classNames(styles.footer, className);
  const pathname = usePathname();

  if (pathname?.startsWith('/studio')) {
    return null;
  }

  return (
    <>
      <a id="footer" tabIndex={-1} />
      <footer className={classes} data-theme="dark">
        <Container className={styles.container}>
          <Logo className={styles.logo} />
          <Socials socials={socials as any} className={styles.socials} />
          <div className={styles.sitemapContainer}>Sitemap</div>
        </Container>
      </footer>
    </>
  );
};

export default Footer;
