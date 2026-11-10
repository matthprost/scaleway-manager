import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabBarLayout } from '../layout/tabBarLayout';
import { useTheme } from '../theme';
import { Pill } from './Pill';

type ToastProps = {
  // Keep it while it fades out
  message: string;
  visible: boolean;
};

// A short success message in an inverse pill, near the bottom, above the tab bar. It fades in and out.
export function Toast({ message, visible }: ToastProps) {
  const { motion, sizes, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const offset = useSharedValue<number>(motion.distance.toastRise);

  useEffect(() => {
    const [x1, y1, x2, y2] = motion.easing.enter;
    const timing = { duration: motion.duration.base, easing: Easing.bezier(x1, y1, x2, y2) };

    if (!visible) {
      opacity.value = withTiming(0, timing);

      return;
    }

    // Told on both platforms: Android wouldn't re-read a live region for the same words twice in a row
    AccessibilityInfo.announceForAccessibility(message);

    // It rises a little as it fades in; with Reduce Motion it only fades, where it stands
    offset.value = reduceMotion ? 0 : motion.distance.toastRise;
    offset.value = withTiming(0, timing);
    opacity.value = withTiming(1, timing);
  }, [visible, message, reduceMotion, motion, opacity, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  // Taps go through it; hidden, screen readers can't reach it
  return (
    <View
      testID="toast-holder"
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: tabBarLayout(insets.bottom).clearance,
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        zIndex: 10,
        elevation: 10,
      }}
    >
      <Animated.View
        testID="toast"
        accessibilityElementsHidden={!visible}
        importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
        style={[{ maxWidth: sizes.contentMaxWidth }, animatedStyle]}
      >
        <Pill tone="inverse" label={message} />
      </Animated.View>
    </View>
  );
}
