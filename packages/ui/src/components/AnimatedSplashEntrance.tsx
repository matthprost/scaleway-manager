import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';

// 'hidden' under the splash, 'enter' as it leaves, 'shown' when no splash plays
export type SplashEntranceState = 'hidden' | 'enter' | 'shown';

// Each turn comes in a little after the one before
const TURNS = { first: 0, second: 1, third: 2 } as const;
// Points the content rises from
const RISE = 20;

type AnimatedSplashEntranceProps = {
  state: SplashEntranceState;
  order: keyof typeof TURNS;
  children: ReactNode;
};

// A block of Welcome's or the lock screen's content that fades and rises in as the splash leaves.
export function AnimatedSplashEntrance({ state, order, children }: AnimatedSplashEntranceProps) {
  const { motion } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(state === 'shown' ? 1 : 0);
  const started = useRef(false);
  const { splashEntrance, splashEntranceDelay, splashEntranceStagger } = motion.duration;
  const [x1, y1, x2, y2] = motion.easing.enter;

  // Starts once; a splash that goes away mid-way doesn't cut it short
  useEffect(() => {
    if (state === 'hidden' || started.current) {
      return;
    }

    started.current = true;

    // With Reduce Motion the content simply shows
    if (state === 'shown' || reduceMotion) {
      progress.value = 1;

      return;
    }

    progress.value = withDelay(
      splashEntranceDelay + TURNS[order] * splashEntranceStagger,
      withTiming(1, { duration: splashEntrance, easing: Easing.bezier(x1, y1, x2, y2) }),
    );
  }, [state, order, reduceMotion, progress, splashEntrance, splashEntranceDelay, splashEntranceStagger, x1, y1, x2, y2]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * RISE }],
  }));

  return (
    <Animated.View testID="splash-entrance" style={style}>
      {children}
    </Animated.View>
  );
}
