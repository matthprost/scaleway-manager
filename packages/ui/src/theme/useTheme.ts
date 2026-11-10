import { useContext } from 'react';

import { ThemeContext } from './ThemeProvider';
import type { Theme } from './ThemeProvider';

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }

  return theme;
}
