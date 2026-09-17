'use client';

import { PortableText } from '@portabletext/react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import Button from '@/components/Button';
import Icon from '@/components/Icon';
import Image from '@/components/Image';
import Link from '@/components/Link';
import Text from '@/components/Text';
import Video from '@/components/Video';
import classNames from '@/helpers/classNames';
import useElementHeight from '@/tools/hooks/useElementHeight';
import type { ILinkElement } from '@/tools/sanity/schema/elements/link';

import styles from './styles.module.scss';

type TextSpacing = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface TextBlockComponentConfig {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: ProjectColor;
  spacing?: TextSpacing | [TextSpacing, TextSpacing];
  className?: string;
  alignment?: ProjectTextAlignment;
  variant?: ProjectFontVariant;
  weight?: ProjectFontWeight;
}

export interface TextBlockProps {
  blocks?: SanityTextBlock[];
  readMore?: boolean;
  wordCount?: number;
  color?: ProjectColor;
  className?: string;
  alignment?: ProjectTextAlignment;

  // Config
  config?: {
    block?: TextBlockComponentConfig;
    listBullet?: TextBlockComponentConfig;
    listNumber?: TextBlockComponentConfig;
    listItemNumber?: TextBlockComponentConfig;
    listItemBullet?: TextBlockComponentConfig;
    h1?: TextBlockComponentConfig;
    h2?: TextBlockComponentConfig;
    h3?: TextBlockComponentConfig;
    h4?: TextBlockComponentConfig;
    h5?: TextBlockComponentConfig;
    h6?: TextBlockComponentConfig;
    p?: TextBlockComponentConfig;
    span?: TextBlockComponentConfig;
    blockquote?: TextBlockComponentConfig;
  };
}
interface ComponentProps {
  children?: React.ReactNode;
}

const TextBlock = (props: TextBlockProps) => {
  const {
    blocks,
    className,
    color = 'themeFgDefault',
    alignment,
    readMore = false,
    wordCount = 150,
    config: providedConfig = {}
  } = props;
  const [showMore, setShowMore] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  const [ref, elementHeight] = useElementHeight({ disabled: !readMore });

  if (!blocks) {
    return null;
  }

  const config: TextBlockProps['config'] = {
    block: {
      alignment,
      color: 'themeFgDefault',
      size: 'md',
      spacing: 'sm',
      ...providedConfig?.block
    },
    blockquote: {
      alignment,
      color: 'themeFgDefault',
      size: 'md',
      spacing: 'lg',
      ...providedConfig?.p
    },
    h1: {
      alignment,
      color: 'themeFgDefault',
      size: 'lg',
      spacing: ['xl', 'lg'],
      ...providedConfig?.h1
    },
    h2: {
      alignment,
      color: 'themeFgDefault',
      size: 'md',
      spacing: ['lg', 'md'],
      ...providedConfig?.h2
    },
    h3: {
      alignment,
      color: 'themeFgDefault',
      size: 'sm',
      spacing: ['md', 'sm'],
      ...providedConfig?.h3
    },
    h4: {
      alignment,
      color: 'themeFgDefault',
      size: 'xs',
      spacing: ['sm', 'xs'],
      ...providedConfig?.h4
    },
    h5: {
      alignment,
      color: 'themeFgDefault',
      size: 'lg',
      spacing: ['sm', 'xs'],
      ...providedConfig?.h5
    },
    h6: {
      alignment,
      color: 'themeFgDefault',
      size: 'lg',
      spacing: ['sm', 'xs'],
      variant: 'heading',
      ...providedConfig?.h6
    },
    listBullet: {
      alignment,
      color: 'themeFgDefault',
      size: 'md',
      spacing: 'md',
      ...providedConfig?.listBullet
    },
    listItemBullet: {
      alignment,
      color: 'themeFgDefault',
      size: 'md',
      spacing: 'sm',
      ...providedConfig?.listItemBullet
    },
    listItemNumber: {
      alignment,
      color: 'themeFgDefault',
      size: 'md',
      spacing: 'md',
      ...providedConfig?.listItemNumber
    },
    listNumber: {
      alignment,
      color: 'themeFgDefault',
      size: 'md',
      spacing: 'md',
      ...providedConfig?.listNumber
    },
    p: {
      alignment,
      color: 'themeFgDefault',
      size: 'md',
      spacing: 'md',
      ...providedConfig?.p
    },
    span: {
      alignment,
      color: 'themeFgDefault',
      size: 'md',
      spacing: 'md',
      ...providedConfig?.p
    }
  };

  const components = {
    block: {
      blockquote: ({ children }: ComponentProps) => (
        <Text as="blockquote" {...config?.blockquote}>
          {children}
        </Text>
      ),
      h1: ({ children }: ComponentProps) => (
        <Text as="h1" variant="heading" size="lg" {...config?.h1}>
          {children}
        </Text>
      ),

      h2: ({ children }: ComponentProps) => (
        <Text as="h2" variant="heading" {...config?.h2}>
          {children}
        </Text>
      ),
      h3: ({ children }: ComponentProps) => (
        <Text as="h3" variant="heading" {...config?.h3}>
          {children}
        </Text>
      ),
      h4: ({ children }: ComponentProps) => (
        <Text as="h4" variant="heading" {...config?.h4}>
          {children}
        </Text>
      ),
      h5: ({ children }: ComponentProps) => (
        <Text as="h5" {...config?.h5}>
          {children}
        </Text>
      ),
      h6: ({ children }: ComponentProps) => (
        <Text as="h6" {...config?.h6}>
          {children}
        </Text>
      ),
      normal: ({ children }: ComponentProps) => (
        <Text as="p" {...config?.span}>
          {children}
        </Text>
      ),
      p: ({ children }: ComponentProps) => (
        <Text as="p" {...config?.p} spacing="sm">
          {children}
        </Text>
      ),
      span: ({ children }: ComponentProps) => (
        <Text as="span" {...config?.span}>
          {children}
        </Text>
      )
    },
    list: {
      bullet: ({ children }: ComponentProps) => (
        <Text as="ul" {...config?.listBullet}>
          {children}
        </Text>
      ),
      number: ({ children }: ComponentProps) => (
        <Text as="ol" {...config?.listNumber}>
          {children}
        </Text>
      )
    },
    listItem: {
      bullet: ({ children }: ComponentProps) => (
        <Text as="li" {...config?.listItemBullet}>
          {children}
        </Text>
      ),
      number: ({ children }: ComponentProps) => (
        <Text as="li" {...config?.listItemNumber}>
          {children}
        </Text>
      )
    },
    marks: {
      link: (props: ComponentProps & { value?: ILinkElement }) => {
        const { children, value } = props || {};
        const internalLink = value?.internalLink;
        const externalLink = value?.externalLink || '';
        const phone = value?.phone || '';
        const email = value?.email || '';
        const linkType = value?.linkType;
        const href = value?.href || ''; // catches links pasted from external sources

        return (
          <Link
            href={href}
            linkType={linkType}
            internalLink={internalLink}
            externalLink={externalLink}
            phone={phone}
            email={email}
            className={styles.link}
          >
            {children}
          </Link>
        );
      },
      markerFont: ({ children }: ComponentProps) => <span className={styles.markerFont}>{children}</span>,
      strong: ({ children }: ComponentProps) => <strong>{children}</strong>
    },
    types: {
      // eslint-disable-next-line typescript-eslint/no-explicit-any -- Sanity block content types are dynamic
      blockContentButtons: (props: any) => {
        const { value } = props;
        const hasButtons = value?.buttons?.length > 0;
        return hasButtons
          ? // eslint-disable-next-line typescript-eslint/no-explicit-any -- Sanity block content types are dynamic
            value.buttons.map((button: any, index: number) => (
              <Link key={index} {...button?.link} title={button?.label} variant="square" size="md" theme="primary">
                <Text text={button?.label} weight="medium" />
              </Link>
            ))
          : null;
      },
      // eslint-disable-next-line typescript-eslint/no-explicit-any -- Sanity block content types are dynamic
      blockContentImage: (props: any) => {
        const { value } = props;
        return (
          <div>
            <Image {...value?.image} sizes="100vw" className={styles.image} />
            <Text as="p" size="md" color="themeFgDefault">
              {value?.caption}
            </Text>
          </div>
        );
      },
      // eslint-disable-next-line typescript-eslint/no-explicit-any -- Sanity block content types are dynamic
      blockContentVideo: (props: any) => {
        const { value } = props;
        if (!value?.videoUrl) {
          return null;
        }
        return <Video url={value.videoUrl} controls />;
      },
      divider: () => <div className={styles.divider} />
    }
  };

  // Possible way to create a more intelligent readMore use plain text
  // const plainText = toPlainText(blocks);

  if (!blocks || blocks.length < 1) {
    return null;
  }

  const content = blocks?.reduce<{
    blocks: SanityTextBlock[];
    blocksHidden: SanityTextBlock[];
    countTotal: number;
    readMoreEnabled: boolean;
  }>(
    (blocksData, block) => {
      const wordsCountParagraph = block?.children?.reduce<number>(
        (countParagraph: number, blockChild: SanityTextBlockChild) => {
          if (!blockChild?.text?.length) {
            return countParagraph;
          }
          const countWord = blockChild?.text.split(' ').length;
          return countParagraph + countWord;
        },
        0
      );
      const countTotal = blocksData.countTotal + wordsCountParagraph;
      blocksData.countTotal = countTotal;
      if (readMore && countTotal > wordCount) {
        blocksData.readMoreEnabled = true;
      }
      if (!readMore || countTotal < wordCount) {
        blocksData.blocks.push(block);
      } else {
        blocksData.blocksHidden.push(block);
      }
      return blocksData;
    },
    { blocks: [], blocksHidden: [], countTotal: 0, readMoreEnabled: false }
  );

  const toggleReadMore = () => {
    if (!showMore) {
      setScrollPosition(window.scrollY);
      setShowMore(!showMore);
    } else {
      window.scrollTo({
        behavior: 'smooth',
        top: scrollPosition
      });

      setTimeout(() => {
        setShowMore(!showMore);
      }, 500);
    }
  };

  return (
    <div className={className}>
      <PortableText value={content?.blocks} components={components} />

      {content?.blocksHidden?.[0] && (
        <div
          className={classNames(styles.hiddenContent, { [styles.viewHiddenContent]: showMore })}
          style={{ maxHeight: showMore && elementHeight ? elementHeight : 0 }}
        >
          <div ref={ref} className={styles.hiddenContentContainer}>
            <PortableText value={content?.blocksHidden} components={components} />
          </div>
        </div>
      )}

      {content?.readMoreEnabled && (
        <Button
          onClick={toggleReadMore}
          className={classNames(styles.readMore, { [styles.active]: showMore })}
          ariaLabel="Read more"
        >
          <Text
            text={showMore ? 'Read less' : 'Read more'}
            size="lg"
            color={color || 'themeFgDefault'}
            weight="medium"
          />
          <Icon title="chevronDown" size="lg" className={styles.icon} color="themeFgDefault" />
        </Button>
      )}
    </div>
  );
};

export default TextBlock;
