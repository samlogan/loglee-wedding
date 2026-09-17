interface SectionFieldsShape {
  spacingOptions?: {
    removeTopSpacing?: boolean;
    removeBottomSpacing?: boolean;
  };
  themeOptions?: {
    theme?: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- section props vary per section
export const getSectionSpacingProps = (props: {
  sectionFields?: SectionFieldsShape;
  [key: string]: any;
}): {
  removeTopSpacing?: boolean;
  removeBottomSpacing?: boolean;
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
} => {
  if (!props || !props.sectionFields || !props.sectionFields.spacingOptions) {
    return {};
  }
  const { spacingOptions } = props.sectionFields;
  const { removeTopSpacing, removeBottomSpacing } = spacingOptions || {
    removeBottomSpacing: false,
    removeTopSpacing: false
  };
  return {
    removeBottomSpacing,
    removeTopSpacing,
    spacing: 'lg'
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- section props vary per section
export const getSectionTheme = (
  props: { sectionFields?: SectionFieldsShape; [key: string]: any },
  defaultTheme?: ProjectTheme
): ProjectTheme | undefined => (props?.sectionFields?.themeOptions?.theme as ProjectTheme) || defaultTheme;
