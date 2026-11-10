import { useRef } from 'react';
import type { ComponentRef, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { WindowRect } from './AnimatedSplash';

type AnimatedSplashLogoSlotProps = {
  // True while the splash's own logo stands in for this one
  hidden: boolean;
  // Gets the logo's place on screen once it is laid out
  onPlace: (place: WindowRect) => void;
  children: ReactNode;
};

// Wraps a screen's LogoMark so the splash's logo can glide into its exact place.
export function AnimatedSplashLogoSlot({ hidden, onPlace, children }: AnimatedSplashLogoSlotProps) {
  const ref = useRef<ComponentRef<typeof View>>(null);

  return (
    <View
      ref={ref}
      testID="splash-logo-slot"
      style={[styles.slot, { opacity: hidden ? 0 : 1 }]}
      onLayout={() =>
        ref.current?.measureInWindow((x, y, width, height) => {
          // A failed measure gives zeros: no place is better than a wrong one
          if (width > 0) {
            onPlace({ x, y, width, height });
          }
        })
      }
    >
      {children}
    </View>
  );
}

// Hugs the logo, so the place measured is the logo's, not the column's
const styles = StyleSheet.create({ slot: { alignSelf: 'flex-start' } });
