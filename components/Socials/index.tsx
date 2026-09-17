import type { FC } from 'react';

import type { IconProps } from '@/components/Icon';
import Icon from '@/components/Icon';
import classNames from '@/helpers/classNames';
import stringClean from '@/tools/helpers/stringClean';

import styles from './styles.module.scss';

interface SocialsProps {
  className?: string;
  size?: IconProps['size'];
  socials?: {
    name: IconProps['title'];
    link: string;
    _key: string;
  }[];
}

const Socials: FC<SocialsProps> = (props) => {
  const { socials, className, size = 'fluid' } = props;

  if (!socials?.[0]) {
    return null;
  }

  return (
    <div className={classNames(styles.container, className)}>
      {socials?.map((social) => {
        const { name: rawName, link, _key: id } = social || {};
        const name = stringClean(rawName) as IconProps['title'];
        return (
          <a
            key={id}
            className={styles.social}
            href={link}
            title={name}
            aria-label={name}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon title={name} size={size} />
          </a>
        );
      })}
    </div>
  );
};

export default Socials;
