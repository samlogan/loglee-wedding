interface SectionFieldsShape {
  spacingOptions?: {
    removeTopSpacing?: boolean;
    removeBottomSpacing?: boolean;
  };
  themeOptions?: {
    theme?: ProjectTheme;
  };
}

interface MockSectionFieldsOptions {
  theme?: ProjectTheme;
  removeTopSpacing?: boolean;
  removeBottomSpacing?: boolean;
}

const mockSectionFields = (options: MockSectionFieldsOptions = {}): SectionFieldsShape => ({
  spacingOptions: {
    removeTopSpacing: options.removeTopSpacing ?? false,
    removeBottomSpacing: options.removeBottomSpacing ?? false
  },
  themeOptions: {
    theme: options.theme
  }
});

export default mockSectionFields;
