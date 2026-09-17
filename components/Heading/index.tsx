import Animation from '@/components/Animation';
import type { TextProps } from '@/components/Text';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

interface HeadingProps {
  className?: string;
  variant?: 'hero' | 'section' | 'body';
  tagline?: string;
  title: string;
  titleAs?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  theme?: 'primary' | 'secondary';
  subtitle?: string;
  cta?: {
    text: string;
    url: string;
  };
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const Heading = (props: HeadingProps) => {
  const {
    title,
    titleAs: titleAsOverride,
    subtitle,
    tagline,
    className,
    spacing = 'md',
    theme = 'primary',
    variant = 'section'
  } = props;
  const classes = classNames(styles.heading, styles[`theme_${theme}`], styles[`spacing_${spacing}`], className);

  const titleByVariant: Record<'hero' | 'section' | 'body', TextProps['as']> = {
    body: 'h4',
    hero: 'h1',
    section: 'h2'
  };

  const titleAs = titleAsOverride || titleByVariant[variant];

  return (
    <div className={classes}>
      {tagline && (
        <Animation>
          <Text as="p" className={styles.tagline} text={tagline} />
        </Animation>
      )}
      {title && (
        <Animation delay={0.4}>
          <Text as={titleAs} className={styles.title} text={title} />
        </Animation>
      )}
      {subtitle && (
        <Animation delay={0.4}>
          <Text as="p" className={styles.subtitle} text={subtitle} />
        </Animation>
      )}
    </div>
  );
};

export default Heading;
