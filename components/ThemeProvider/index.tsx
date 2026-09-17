'use client';

import { createContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface ThemeContextProps {
  headerTheme: string;
  setHeaderTheme: (theme: string) => void;
}

export const ThemeContext = createContext<ThemeContextProps>({
  headerTheme: 'light',
  setHeaderTheme: () => {}
});

export interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider = (props: ThemeProviderProps) => {
  const { children } = props;
  const [headerTheme, setHeaderTheme] = useState('light');

  return (
    <ThemeContext.Provider
      value={{
        headerTheme,
        setHeaderTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
