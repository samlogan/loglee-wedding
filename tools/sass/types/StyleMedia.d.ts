type StyleResponsive<T> =
  | T
  | {
      initial?: T;
      xs?: T;
      sm?: T;
      md?: T;
      lg?: T;
      xl?: T;
    };

interface StyleBreakpoints {
  initial?: string;
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}
