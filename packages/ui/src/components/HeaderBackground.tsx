import { LinearGradient } from 'expo-linear-gradient';
import { useContext, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { noticeLayout } from '../layout/noticeLayout';
import { useTheme } from '../theme';
import { HeaderLayoutContext } from './Screen';

// Welcome's dot grid, from the approved mockup: small white dots, 20 pt apart, strongest in the middle
// of an oval (centre 50% across and 60% down, 56% of the width and 29% of the height out) and fading to nothing at its edge
const DOT_RADIUS = 1.5;
const DOT_CENTRE = { x: 0.5, y: 0.6 };
const DOT_REACH = { x: 0.56, y: 0.29 };
const DOT_OPACITY = { light: 0.42, dark: 0.34 };
// The fade is drawn in a few steps: one shape per step, not one per dot
const DOT_STEPS = 8;

type HeaderBackgroundProps = {
  // At least this tall, inset area included; it grows if its content needs more. Leave it out to fit the content.
  minHeight?: number;
  // Fills the screen instead of a fixed height (Welcome, lock)
  fill?: boolean;
  // Keeps the content below the status bar when the header starts at the very top
  insetTop?: boolean;
  // The floating notice (offline pill, Demo badge) is up: the content slides down below it, and back when it goes
  noticeShown?: boolean;
  // Keeps the content above the home indicator when the header reaches the very bottom
  insetBottom?: boolean;
  // Cards overlap its bottom (Stack overlapHeader): the content stops above them, with the usual gap
  overlapped?: boolean;
  // A still grid of small dots behind the content (Welcome)
  dots?: boolean;
  children?: ReactNode;
};

export function HeaderBackground({
  minHeight,
  fill = false,
  insetTop = false,
  noticeShown = false,
  insetBottom = false,
  overlapped = false,
  dots = false,
  children,
}: HeaderBackgroundProps) {
  const { scheme, colors, radii, sizes, spacing, motion } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const reportBottom = useContext(HeaderLayoutContext);
  // The notice's room below the status bar
  const room = noticeShown ? noticeLayout(insets.top, fontScale).clearance - insets.top : 0;
  // Already in place when it first draws (offline at launch): only a change moves it
  const offset = useSharedValue(room);
  const opacity = useSharedValue(1);
  const placed = useRef(room);
  const { base } = motion.duration;
  const [x1, y1, x2, y2] = motion.easing.standard;

  useEffect(() => {
    if (room === placed.current) {
      return;
    }

    placed.current = room;

    // With Reduce Motion: no slide, the content is in its new place at once and fades in
    if (reduceMotion) {
      offset.value = room;
      opacity.value = 0;
      // This fade is the Reduce Motion path: Reanimated must not skip it for the system setting
      opacity.value = withTiming(1, { duration: base, reduceMotion: ReduceMotion.Never });

      return;
    }

    offset.value = withTiming(room, { duration: base, easing: Easing.bezier(x1, y1, x2, y2) });
  }, [room, reduceMotion, offset, opacity, base, x1, y1, x2, y2]);

  // The notice's room sits above the content, inside the purple, so the header grows with it
  const contentStyle = useAnimatedStyle(() => ({ marginTop: offset.value, opacity: opacity.value }));

  // Each step of the fade: one path of dots, the strongest step last. Placed on the window: the header fills it.
  // Worked out again only when the window's size changes.
  const dotSteps = useMemo(() => {
    const steps = Array.from({ length: dots ? DOT_STEPS : 0 }, () => '');

    if (!dots) {
      return steps;
    }

    for (let y = (height % spacing.lg) / 2; y < height; y += spacing.lg) {
      for (let x = (width % spacing.lg) / 2; x < width; x += spacing.lg) {
        const far = ((x / width - DOT_CENTRE.x) / DOT_REACH.x) ** 2 + ((y / height - DOT_CENTRE.y) / DOT_REACH.y) ** 2;
        const step = Math.round((1 - far) * DOT_STEPS);

        if (step > 0) {
          steps[step - 1] += `M${x - DOT_RADIUS},${y}a${DOT_RADIUS},${DOT_RADIUS} 0 1,0 ${2 * DOT_RADIUS},0a${DOT_RADIUS},${DOT_RADIUS} 0 1,0 ${-2 * DOT_RADIUS},0`;
        }
      }
    }

    return steps;
  }, [dots, width, height, spacing.lg]);

  // At the top of a Screen, it tells the Screen where its bottom edge is (for the status bar and the splash)
  return (
    <LinearGradient
      testID="header-gradient"
      onLayout={
        reportBottom ? (event) => reportBottom(event.nativeEvent.layout.y + event.nativeEvent.layout.height) : undefined
      }
      colors={colors.headerGradient as [string, string, ...string[]]}
      // 165deg: mostly top-to-bottom, leaning right
      start={{ x: 0.37, y: 0 }}
      end={{ x: 0.63, y: 1 }}
      style={{
        minHeight,
        flex: fill ? 1 : undefined,
        // A full-height header reaches the bottom of the screen: square corners
        borderBottomLeftRadius: fill ? 0 : radii.xl,
        borderBottomRightRadius: fill ? 0 : radii.xl,
      }}
    >
      {dots ? (
        <View
          testID="header-dots"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}
        >
          <Svg width="100%" height="100%">
            {dotSteps.map((path, index) => (
              <Path
                key={`step-${index + 1}`}
                testID="header-dots-step"
                d={path}
                fill={colors.onBrand}
                fillOpacity={((index + 1) / DOT_STEPS) * DOT_OPACITY[scheme]}
              />
            ))}
          </Svg>
        </View>
      ) : null}

      <Animated.View
        testID="header-content"
        style={[
          {
            flexGrow: 1,
            // The purple reaches the screen edges; the content is centred on wide screens
            width: '100%',
            maxWidth: sizes.contentMaxWidth,
            alignSelf: 'center',
            paddingTop: insetTop ? insets.top : 0,
            // The cards cover radii.xl of it (Stack overlapHeader), plus a gap above them
            paddingBottom: (insetBottom ? insets.bottom : 0) + (overlapped ? radii.xl + spacing.md : 0),
          },
          contentStyle,
        ]}
      >
        {children}
      </Animated.View>
    </LinearGradient>
  );
}
