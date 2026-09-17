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
import { AMOUNT_MARK } from '@/helpers/amountToken';
import classNames from '@/helpers/classNames';
import useElementHeight from '@/tools/hooks/useElementHeight';
import type { ILinkElement } from '@/tools/sanity/schema/elements/link';

import styles from './styles.module.scss';

type TextSpacing = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface TextBlockComponentConfig {
  /*
   * `ProjectFontSize`, not a hand-copied union.
   *
   * Every value here is spread straight onto `Text`, whose `size` is `ProjectFontSize` — so this was
   * a duplicate of that type that had fallen one step behind it. `2xl` exists on the scale and in
   * `components/Text/styles.module.scss` (`--body-2xl`), and was the only step a caller could not
   * ask for: `config={{ p: { size: '2xl' } }}` was a type error rather than the largest body step.
   * Widening only, so no existing caller changes.
   */
  size?: ProjectFontSize;
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
    /*
     * Threaded into every handler below, which it was not.
     *
     * Each config entry hardcoded `color: 'themeFgDefault'`, so this prop reached only the read-more
     * label at the bottom of the file and a caller writing `<TextBlock color="themeFgMuted">` saw
     * nothing happen — while the sibling `alignment` prop was threaded correctly, which is what
     * makes it an oversight rather than a design. The destructured default preserves the previous
     * value, so no existing caller changes; none passes `color` today.
     */
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
      color,
      size: 'md',
      spacing: 'sm',
      ...providedConfig?.block
    },
    /*
     * `providedConfig?.blockquote`, not `providedConfig?.p`.
     *
     * This spread the `p` config, so the `blockquote` key declared on `TextBlockProps['config']`
     * could never take effect and a caller's `p` overrides silently leaked into blockquotes.
     * Unreachable today — no `blockContent*` schema offers a blockquote style — so this is a
     * correction to declared API rather than a behaviour change.
     */
    blockquote: {
      alignment,
      color,
      size: 'md',
      spacing: 'lg',
      ...providedConfig?.blockquote
    },
    h1: {
      alignment,
      color,
      size: 'lg',
      spacing: ['xl', 'lg'],
      ...providedConfig?.h1
    },
    h2: {
      alignment,
      color,
      size: 'md',
      spacing: ['lg', 'md'],
      ...providedConfig?.h2
    },
    h3: {
      alignment,
      color,
      size: 'sm',
      spacing: ['md', 'sm'],
      ...providedConfig?.h3
    },
    h4: {
      alignment,
      color,
      size: 'xs',
      spacing: ['sm', 'xs'],
      ...providedConfig?.h4
    },
    h5: {
      alignment,
      color,
      size: 'lg',
      spacing: ['sm', 'xs'],
      ...providedConfig?.h5
    },
    h6: {
      alignment,
      color,
      size: 'lg',
      spacing: ['sm', 'xs'],
      variant: 'heading',
      ...providedConfig?.h6
    },
    listBullet: {
      alignment,
      color,
      size: 'md',
      spacing: 'md',
      ...providedConfig?.listBullet
    },
    listItemBullet: {
      alignment,
      color,
      size: 'md',
      spacing: 'sm',
      ...providedConfig?.listItemBullet
    },
    listItemNumber: {
      alignment,
      color,
      size: 'md',
      spacing: 'md',
      ...providedConfig?.listItemNumber
    },
    listNumber: {
      alignment,
      color,
      size: 'md',
      spacing: 'md',
      ...providedConfig?.listNumber
    },
    p: {
      alignment,
      color,
      size: 'md',
      spacing: 'md',
      ...providedConfig?.p
    },
    span: {
      alignment,
      color,
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
            /*
             * `content` is the variant for a link inside prose, and this mark had no variant at all
             * — so it inherited the button base's `inline-flex` and became an unbreakable box that
             * refused to wrap mid-paragraph. It also gets the underline that stops the link relying
             * on colour alone.
             */
            variant="content"
          >
            {children}
          </Link>
        );
      },
      /*
       * The highlighted inline token — a run of prose lifted out of the sentence it sits in without
       * leaving it.
       *
       * Produced by `tools/helpers/amountToken`, which splits the Portable Text child holding a
       * `{amount}` placeholder and hangs this decorator on the substituted figure. Today
       * `sections/TwoColumnListSection` is its only route onto a page.
       *
       * ## Why the renderer lives here and not in the section
       *
       * A mark renderer is a React *component*, and `TextBlock` is a client component that server
       * sections render. A function prop does not cross that boundary — passing
       * `marks={{ amountToken: … }}` from a section would be a serialisation error, not a styling
       * choice — so the only place this can be registered is inside the component that owns the
       * `PortableText` call. The alternative, leaving the mark unregistered, renders
       * `<span class="unknown__pt__mark__amountToken">` from the library's fallback and logs a
       * warning: the figure appears as plain text and nothing looks broken.
       *
       * The key is computed from the shared constant rather than written out, so a rename moves
       * both ends at once. The treatment itself is written entirely in `currentColor` and theme
       * tokens (see `styles.module.scss`), so it reads correctly on a light section and on a dark
       * one without either end knowing which it is on.
       */
      [AMOUNT_MARK]: ({ children }: ComponentProps) => <span className={styles.amountToken}>{children}</span>,
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
        <Button onClick={toggleReadMore} className={classNames(styles.readMore, { [styles.active]: showMore })}>
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
