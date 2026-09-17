'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { FC } from 'react';

import Button from '@/components/Button';
import Icon from '@/components/Icon';
import Link from '@/components/Link';

import styles from './styles.module.scss';

export type ShareSocial = 'facebook' | 'twitter' | 'linkedin';

export interface SocialsShareProps {
  className?: string;
  url?: string;
  text?: string;
  socials?: ShareSocial[];
  copyLink?: boolean;
  /*
   * `variant` and `position` used to be declared here and were never read — not destructured, never
   * referenced through `props`, and with no matching classes in the stylesheet. Two stories claimed
   * to demonstrate them and rendered DOM byte-identical to `Default`, which is a story documenting
   * nothing. Removed rather than left in place: an interface advertising options that do nothing is
   * worse than one that does not offer them. Add them back with an implementation and a story that
   * visibly differs.
   */
}

const SocialsShare: FC<SocialsShareProps> = (props) => {
  const { socials = ['twitter', 'facebook', 'linkedin'], url, copyLink = true } = props;

  const [isCopied, setIsCopied] = useState(false);
  const pathname = usePathname();
  const urlToShare = url || process.env.NEXT_PUBLIC_SITE_URL + pathname;

  interface ShareTo {
    url?: string;
    icon?: ShareSocial;
  }

  const shareTo = socials.reduce((accumulator, socialId) => {
    const social: ShareTo = {
      icon: socialId
    };
    switch (socialId) {
      case 'facebook': {
        social.url = `https://www.facebook.com/sharer/sharer.php?u=${urlToShare}`;
        break;
      }
      case 'twitter': {
        social.url = `https://twitter.com/intent/tweet?url=${urlToShare}`;
        break;
      }
      // case 'pinterest':
      //   social.url = `https://www.pinterest.com/pin/create/button/?url=${urlToShare}`;
      //   break;
      case 'linkedin': {
        social.url = `https://www.linkedin.com/sharing/share-offsite/?url=${urlToShare}`;
        break;
      }
      default: {
        return accumulator;
      }
    }

    accumulator.push(social);
    return accumulator;
  }, [] as ShareTo[]);

  return (
    <div className={styles.container}>
      {copyLink && (
        <Button
          className={styles.socialLink}
          onClick={() => {
            navigator.clipboard.writeText(urlToShare);
            setIsCopied(true);
            setTimeout(() => {
              setIsCopied(false);
            }, 3000);
          }}
          ariaLabel="Copy link to clipboard"
        >
          <Icon className={styles.socialIcon} title="link" size="fluid" />
        </Button>
      )}

      {shareTo?.map((social) => {
        const { url, icon } = social;
        return (
          // The link renders an icon and no text, so it needs its own label — without one a screen
          // reader announces only the destination URL, and three share links read identically.
          <Link ariaLabel={`Share on ${icon}`} className={styles.socialLink} key={icon} href={url} target="_blank">
            <Icon className={styles.socialIcon} title={icon} size="fluid" />
          </Link>
        );
      })}
    </div>
  );
};

export default SocialsShare;
