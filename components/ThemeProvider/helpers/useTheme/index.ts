import { useContext } from 'react';

import { ThemeContext } from '../../index';

const useTheme = () => {
  const themeContext = useContext(ThemeContext);
  return themeContext;
};

export default useTheme;
