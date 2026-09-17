interface SectionFieldsShape {
  spacingOptions?: {
    removeTopSpacing?: boolean;
    removeBottomSpacing?: boolean;
  };
  themeOptions?: {
    theme?: string;
  };
}

export const getSectionSpacingProps = (props: {
  sectionFields?: SectionFieldsShape;
  /*
   * The directive has to sit here, immediately above the `any`, and spell the rule the way oxlint
   * names it. It previously sat above the `export` line with an `@typescript-eslint/` prefix, so it
   * was inert twice over: `eslint-disable-next-line` covers exactly one line, and this repo's
   * linter has no `@`-prefixed rule of that name. CLAUDE.md warns that a disable comment can
   * suppress nothing here; this was the example.
   */
  // eslint-disable-next-line typescript-eslint/no-explicit-any -- section props vary per section
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

export const getSectionTheme = (
  props: {
    sectionFields?: SectionFieldsShape;
    // eslint-disable-next-line typescript-eslint/no-explicit-any -- section props vary per section
    [key: string]: any;
  },
  defaultTheme?: ProjectTheme
): ProjectTheme | undefined => (props?.sectionFields?.themeOptions?.theme as ProjectTheme) || defaultTheme;
