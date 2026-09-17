export type Breakpoints = Partial<Record<keyof typeof breakpoints, string>> & { any?: string };

const breakpoints = {
  desktop: '1340px',
  giant: '2200px',
  largeDesktop: '1600px',
  largeMobile: '500px',
  largeTablet: '1025px',
  mediumTablet: '900px',
  mobile: '400px',
  smallDesktop: '1260px',
  smallMobile: '340px',
  smallTablet: '660px',
  tablet: '769px'
};

export default breakpoints;
