import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

import { useTheme } from '../theme';

type StatusBarProps = {
  // true while purple is under the status bar (Home's header, the splash, Welcome, the lock screen)
  onBrand: boolean;
};

// The phone's clock and icons: light on purple, otherwise they follow the theme.
export function StatusBar({ onBrand }: StatusBarProps) {
  const { scheme } = useTheme();

  return <ExpoStatusBar style={onBrand || scheme === 'dark' ? 'light' : 'dark'} />;
}
