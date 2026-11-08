import { createContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import {
  darkColors,
  lightColors,
  motion,
  radii,
  sizes,
  spacing,
  typography,
} from '../tokens';
import type { AppearancePreference, ColorScheme, ThemeColors } from '../tokens';

export type Theme = {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  motion: typeof motion;
  sizes: typeof sizes;
  // The phone's Reduce Motion setting, for code that doesn't import Reanimated (navigators)
  reduceMotion: boolean;
};

export const ThemeContext = createContext<Theme | null>(null);

type ThemeProviderProps = {
  preference: AppearancePreference;
  children: ReactNode;
};

export function ThemeProvider({ preference, children }: ThemeProviderProps) {
  const phoneScheme = useColorScheme();
  const reduceMotion = useReducedMotion();
  const scheme: ColorScheme =
    preference === 'system' ? (phoneScheme === 'dark' ? 'dark' : 'light') : preference;

  const theme = useMemo<Theme>(
    () => ({
      scheme,
      colors: scheme === 'dark' ? darkColors : lightColors,
      spacing,
      radii,
      typography,
      motion,
      sizes,
      reduceMotion,
    }),
    [scheme, reduceMotion],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
