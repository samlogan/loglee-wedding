import Container from '@/components/Container';
import Text from '@/components/Text';

import styles from './styles.module.scss';

type HeaderBannerProps = Record<string, unknown>;

const HeaderBanner = (props: HeaderBannerProps) => (
  <div className={styles.container} data-theme="dark">
    Banner
  </div>
);

export default HeaderBanner;
