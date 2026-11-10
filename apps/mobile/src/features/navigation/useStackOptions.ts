import { useTheme } from '@scaleway-manager/ui';

// Every Stack's options (the root, Account's and Resources'): no native header, and with Reduce Motion a plain fade
// like every other animation. No iOS scroll edge effect: iOS 27 draws it as an opaque band with a line under the
// status bar, over our own headers.
export function useStackOptions() {
  const { reduceMotion, motion } = useTheme();

  return {
    headerShown: false,
    animation: reduceMotion ? 'fade' : 'default',
    animationDuration: motion.duration.base,
    scrollEdgeEffects: { top: 'hidden', bottom: 'hidden', left: 'hidden', right: 'hidden' },
  } as const;
}
