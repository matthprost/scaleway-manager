import type { SplashEntranceState, WindowRect } from '@scaleway-manager/ui';
import { createContext, useContext } from 'react';

// The full-screen purple pages the splash's logo can glide into
export type HandOverScreen = 'welcome' | 'lock';

export type SplashHandOver = {
  // Where the screen's content is: hidden under the splash, coming in as it leaves, or simply shown
  entrance: SplashEntranceState;
  // True while the splash's logo stands in for the screen's own logo
  logoHidden: boolean;
  reportLogo: (screen: HandOverScreen, place: WindowRect) => void;
  // Home's header, as tall as it really is: the purple lands on exactly that
  reportHeaderHeight: (height: number) => void;
};

// No splash (tests, or a screen opened later): screens show normally
export const SplashHandOverContext = createContext<SplashHandOver>({
  entrance: 'shown',
  logoHidden: false,
  reportLogo: () => {},
  reportHeaderHeight: () => {},
});

// What Welcome or the lock screen needs to take part in the splash hand-over.
export function useSplashHandOver(screen: HandOverScreen) {
  const { entrance, logoHidden, reportLogo } = useContext(SplashHandOverContext);

  return {
    entrance,
    logoHidden,
    onLogoPlace: (place: WindowRect) => reportLogo(screen, place),
  };
}

// What Home and the tab bar need: when to come in (hidden under the splash, coming in as it leaves, or simply
// shown), and where Home's header really ends.
export function useHomeHandOver(): { entrance: SplashEntranceState; reportHeaderHeight: (height: number) => void } {
  const { entrance, reportHeaderHeight } = useContext(SplashHandOverContext);

  return { entrance, reportHeaderHeight };
}
