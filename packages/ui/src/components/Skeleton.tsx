import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';
import type { radii as radiiTokens, TypographyVariant } from '../tokens';

type SkeletonProps = {
  width: number | '100%';
  // Default: one line of `variant` text, grown with the phone's text size like the line it stands for
  height?: number;
  // The text style of that line (default body): 'display' for a big amount
  variant?: TypographyVariant;
  radius?: keyof typeof radiiTokens;
  // 'onBrand': a soft white for the purple header
  tone?: 'default' | 'onBrand';
};

// A pulsing placeholder. Stays still when Reduce Motion is on.
export function Skeleton({ width, height, variant = 'body', radius = 'sm', tone = 'default' }: SkeletonProps) {
  const { colors, radii, motion, typography } = useTheme();
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    opacity.value = withRepeat(withTiming(0.5, { duration: motion.duration.slow }), -1, true);
  }, [reduceMotion, opacity, motion.duration.slow]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      testID="skeleton"
      style={[
        {
          width,
          height: height ?? typography[variant].lineHeight * fontScale,
          borderRadius: radii[radius],
          backgroundColor: tone === 'onBrand' ? colors.skeletonOnBrand : colors.divider,
        },
        animatedStyle,
      ]}
    />
  );
}
