import Text from '@/components/Text';
import stripTitleTags from '@/tools/helpers/stripTitleTags';

export interface TextTitleProps {
  className?: string;
  title?: string;
  variant?: ProjectProseFontVariant;
  size?: ProjectFontSize;
  color?: ProjectColor;
  alignment?: ProjectTextAlignment;
  /*
   * Forwarded to `Text`, which has had this prop all along — `TextTitle` simply did not pass it on,
   * so a caller wanting a title in capitals had no prop to reach for and wrote `text-transform` in
   * its own module instead. That is the case `/review-design` rule 4 ("props over section CSS") is
   * about, and the gap was in this component rather than in the sections working around it.
   */
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | null;
}

const TextTitle = (props: TextTitleProps) => {
  const { className, title, variant = 'body', size = 'md', color, alignment, textTransform, as } = props;

  if (!title) {
    return null;
  }

  const { text, as: titleAs } = stripTitleTags(title);

  return (
    <Text
      as={as || titleAs}
      text={text}
      variant={variant}
      size={size}
      color={color}
      alignment={alignment}
      textTransform={textTransform}
      className={className}
    />
  );
};

export default TextTitle;
