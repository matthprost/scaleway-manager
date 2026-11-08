import { BlurView } from 'expo-blur';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabBarLayout } from '../layout/tabBarLayout';
import { useTheme } from '../theme';
import type { SplashEntranceState } from './AnimatedSplashEntrance';
import { Icon } from './Icon';
import type { IconName } from './Icon';

type TabItem = { key: string; icon: IconName; label: string };

type FloatingTabBarProps = {
  items: readonly TabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  // 'hidden' under the start-up splash, 'enter' as it leaves (it slides up with Home's cards), 'shown' otherwise
  entrance?: SplashEntranceState;
};

// Icon-only capsule that floats above the screen content, as wide as its tabs.
export function FloatingTabBar({ items, activeKey, onSelect, entrance = 'shown' }: FloatingTabBarProps) {
  const { colors, radii, sizes, spacing, scheme, motion } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(entrance === 'shown' ? 1 : 0);
  const started = useRef(false);
  const layout = tabBarLayout(insets.bottom);
  // The hairline around the bar
  const border = 1;
  // One slot per tab, inside the 4 pt padding and the border; the slots narrow only on a very narrow window
  const width = Math.min(
    items.length * sizes.tabItemWidth + 2 * (spacing.xxs + border),
    windowWidth - 2 * sizes.tabBarInset,
  );
  // Just below the screen's bottom edge until it comes in
  const offScreen = layout.bottom + layout.height;
  const { splashEntrance, splashEntranceDelay } = motion.duration;
  const [x1, y1, x2, y2] = motion.easing.enter;

  // Starts once, with Home's cards; a splash that goes away mid-way doesn't cut it short
  useEffect(() => {
    if (entrance === 'hidden' || started.current) {
      return;
    }

    started.current = true;

    // With Reduce Motion it is simply there
    if (entrance === 'shown' || reduceMotion) {
      progress.value = 1;

      return;
    }

    progress.value = withDelay(
      splashEntranceDelay,
      withTiming(1, { duration: splashEntrance, easing: Easing.bezier(x1, y1, x2, y2) }),
    );
  }, [entrance, reduceMotion, progress, splashEntrance, splashEntranceDelay, x1, y1, x2, y2]);

  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * offScreen }] }));

  return (
    <Animated.View
      testID="floating-tab-bar"
      style={[
        {
          position: 'absolute',
          alignSelf: 'center',
          bottom: layout.bottom,
          width,
          height: layout.height,
          borderRadius: radii.pill,
          borderWidth: border,
          borderColor: colors.tabBarBorder,
          overflow: 'hidden',
        },
        slideStyle,
      ]}
    >
      <BlurView intensity={40} tint={scheme} style={StyleSheet.absoluteFill} />

      <View
        testID="floating-tab-row"
        accessibilityRole="tablist"
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xxs,
          backgroundColor: colors.tabBarBackground,
        }}
      >
        {items.map((item) => {
          const selected = item.key === activeKey;

          // The slot is the touch area (at least 44 × 44); the active one is filled by its capsule
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => ({
                width: sizes.tabItemWidth,
                minWidth: sizes.touchMin,
                flexShrink: 1,
                height: sizes.tabItemHeight,
                borderRadius: radii.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? colors.tabActiveBackground : 'transparent',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Icon name={item.icon} tone={selected ? 'active' : 'idle'} />
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
