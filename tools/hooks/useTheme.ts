import { useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'auto';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'auto';
    }
    return (localStorage.getItem('theme') as Theme) || 'auto';
  });

  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const resolvedTheme = theme === 'auto' ? systemPreference : theme;

  // Apply theme to document
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    localStorage.setItem('theme', theme);
  }, [theme, resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      setSystemPreference(mediaQuery.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const resolved = prev === 'auto' ? systemPreference : prev;
      return resolved === 'light' ? 'dark' : 'light';
    });
  }, [systemPreference]);

  const setThemeMode = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  return {
    isDark: resolvedTheme === 'dark',
    resolvedTheme,
    setTheme: setThemeMode,
    theme,
    toggleTheme
  };
};
