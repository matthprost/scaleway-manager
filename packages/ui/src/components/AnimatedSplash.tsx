import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '../theme';
import { brandTypography, sizes } from '../tokens';
import type { TypographyStyle } from '../tokens';
import { LogoMark } from './LogoMark';

// A place on screen, in points from the top-left corner of the window
export type WindowRect = { x: number; y: number; width: number; height: number };

type AnimatedSplashProps = {
  phase: 'waiting' | 'leaving';
  // 'header': lands on Home's header. 'screen': lands on a full-screen purple page (Welcome, lock).
  target: 'header' | 'screen';
  // How tall Home's header is (useHomeHeaderLayout): the purple shrinks to exactly this on 'header'
  headerHeight: number;
  // Where that page's own logo sits ('screen' only). Without it, the logo fades out instead.
  logoTarget?: WindowRect;
  onFinished: () => void;
};

// Sizes and distances from the approved mockup, in points
const LOGO_SIZE = sizes.logoSplash;
const RISE = 60;
const RISE_SCALE = 0.82;
const LEAVE = 230;
const LEAVE_SCALE = 0.7;
const LETTER_RISE = 20;
const LETTER_BLUR = 10;
// Top of each line of the name, below the middle of the screen
const SCALEWAY_TOP = 33;
const MANAGER_TOP = 82;

// a when t is 0, b when t is 1 (exactly)
function mix(a: number, b: number, t: number) {
  'worklet';

  return a * (1 - t) + b * t;
}

type LetterProps = {
  char: string;
  delay: number;
  look: TypographyStyle;
};

// One letter of the name: it fades in, rises into place and, on Android, comes out of a blur.
function Letter({ char, delay, look }: LetterProps) {
  const { colors, motion } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  // React Native draws `filter: blur` on Android only
  const blurs = Platform.OS === 'android';
  const { splashLetter } = motion.duration;
  const [x1, y1, x2, y2] = motion.easing.enter;

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    progress.value = withDelay(
      delay,
      withTiming(1, { duration: splashLetter, easing: Easing.bezier(x1, y1, x2, y2) }),
    );
  }, [delay, progress, reduceMotion, splashLetter, x1, y1, x2, y2]);

  const style = useAnimatedStyle(() => {
    const left = 1 - progress.value;
    const shown = { opacity: progress.value, transform: [{ translateY: left * LETTER_RISE }] };

    return blurs ? { ...shown, filter: [{ blur: left * LETTER_BLUR }] } : shown;
  });

  return (
    <Animated.Text
      testID="splash-letter"
      // Part of the logo: never bigger or smaller with the phone's text size
      allowFontScaling={false}
      style={[look, { color: colors.onBrand }, style]}
    >
      {char}
    </Animated.Text>
  );
}

// The start-up screen: the logo rises, the name writes itself in, then it hands over to Home, Welcome or the lock screen.
export function AnimatedSplash({ phase, target, headerHeight, logoTarget, onFinished }: AnimatedSplashProps) {
  const { colors, radii, motion } = useTheme();
  const reduceMotion = useReducedMotion();
  const windowSize = useWindowDimensions();
  // Its own size once laid out (the app's root view), else the window's
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const { width, height } = box ?? windowSize;
  // With Reduce Motion the logo stays where the native splash put it
  const rise = useSharedValue(0);
  // Reduce Motion only: the name fades in under the logo
  const reveal = useSharedValue(reduceMotion ? 0 : 1);
  const handOver = useSharedValue(0);
  const nameOpacity = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const purpleOpacity = useSharedValue(1);
  const fade = useSharedValue(1);
  // Set when the hand-over starts. `glide`: where the logo goes (null: it fades out instead).
  const plan = useSharedValue<{ header: boolean; glide: { x: number; y: number; scale: number } | null }>({
    header: false,
    glide: null,
  });
  const finishedRef = useRef(onFinished);
  const hasFinished = useRef(false);
  const hasStarted = useRef(false);
  // True when the hand-over started with a place for the logo to glide to
  const gliding = useRef(false);
  const { duration, easing } = motion;
  const lines = [
    { text: 'Scaleway', look: brandTypography.splashName, top: SCALEWAY_TOP, delay: duration.splashNameDelay },
    {
      text: 'MANAGER',
      look: brandTypography.splashNameLight,
      top: MANAGER_TOP,
      delay: duration.splashNameDelay + duration.splashLineDelay,
    },
  ];

  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  // Stable JS function: calls the latest callback, at most once
  const finish = useCallback(() => {
    if (hasFinished.current) {
      return;
    }

    hasFinished.current = true;
    finishedRef.current();
  }, []);

  // The intro: the logo rises (or, with Reduce Motion, the name fades in)
  useEffect(() => {
    if (reduceMotion) {
      reveal.value = withDelay(duration.splashRiseDelay, withTiming(1, { duration: duration.base }));

      return;
    }

    const [x1, y1, x2, y2] = easing.overshoot;
    rise.value = withDelay(
      duration.splashRiseDelay,
      withTiming(1, { duration: duration.splashRise, easing: Easing.bezier(x1, y1, x2, y2) }),
    );
  }, [reduceMotion, reveal, rise, duration, easing]);

  // The hand-over
  useEffect(() => {
    if (phase !== 'leaving') {
      return;
    }

    if (hasStarted.current) {
      // The screen it was gliding to went away (Face ID unlocked mid-way, say): the logo fades where it is
      if (gliding.current && logoTarget === undefined) {
        gliding.current = false;
        logoOpacity.value = withTiming(0, { duration: duration.splashFadeOut });
      }

      return;
    }

    hasStarted.current = true;

    const done = (finished?: boolean) => {
      'worklet';

      if (finished) {
        scheduleOnRN(finish);
      }
    };

    if (reduceMotion) {
      fade.value = withTiming(0, { duration: duration.base }, done);

      return;
    }

    const header = target === 'header';
    const glide =
      !header && logoTarget !== undefined
        ? {
            x: logoTarget.x + logoTarget.width / 2 - width / 2,
            y: logoTarget.y + logoTarget.height / 2 - height / 2,
            scale: logoTarget.width / LOGO_SIZE,
          }
        : null;
    const [x1, y1, x2, y2] = easing.glide;

    gliding.current = glide !== null;
    plan.value = { header, glide };
    handOver.value = withTiming(1, { duration: duration.splashHandOver, easing: Easing.bezier(x1, y1, x2, y2) });
    nameOpacity.value = withDelay(duration.splashFadeOutDelay, withTiming(0, { duration: duration.splashFadeOut }));

    if (glide === null) {
      logoOpacity.value = withDelay(duration.splashFadeOutDelay, withTiming(0, { duration: duration.splashFadeOut }));
    }

    // The purple fades last: after it reaches the header, or as the logo lands
    purpleOpacity.value = withDelay(
      header ? duration.splashHandOver : duration.splashHandOver - duration.splashPurpleFade,
      withTiming(0, { duration: duration.splashPurpleFade }, done),
    );
  }, [
    phase,
    target,
    logoTarget,
    width,
    height,
    reduceMotion,
    duration,
    easing,
    finish,
    fade,
    plan,
    handOver,
    nameOpacity,
    logoOpacity,
    purpleOpacity,
  ]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const purpleStyle = useAnimatedStyle(() => {
    const shrink = plan.value.header ? handOver.value : 0;

    return {
      height: mix(height, headerHeight, shrink),
      borderBottomLeftRadius: radii.xl * shrink,
      borderBottomRightRadius: radii.xl * shrink,
      opacity: purpleOpacity.value,
    };
  });

  // The first frame is the native splash's flat purple; the header gradient comes in as the logo rises
  const gradientStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? reveal.value : Math.min(rise.value, 1),
  }));

  const logoStyle = useAnimatedStyle(() => {
    const going = handOver.value;
    const restY = mix(0, -RISE, rise.value);
    const restScale = mix(1, RISE_SCALE, rise.value);
    const { glide } = plan.value;

    if (glide !== null) {
      return {
        opacity: logoOpacity.value,
        transform: [
          { translateX: glide.x * going },
          { translateY: mix(restY, glide.y, going) },
          { scale: mix(restScale, glide.scale, going) },
        ],
      };
    }

    return {
      opacity: logoOpacity.value,
      transform: [
        { translateX: 0 },
        { translateY: restY - LEAVE * going },
        { scale: restScale * mix(1, LEAVE_SCALE, going) },
      ],
    };
  });

  const nameStyle = useAnimatedStyle(() => ({
    opacity: reveal.value * nameOpacity.value,
    transform: [{ translateY: -LEAVE * handOver.value }, { scale: mix(1, LEAVE_SCALE, handOver.value) }],
  }));

  // Blocks taps while waiting, so none reaches the hidden screen; lets them through while leaving
  return (
    <Animated.View
      testID="splash"
      style={[StyleSheet.absoluteFill, overlayStyle]}
      pointerEvents={phase === 'leaving' ? 'none' : 'auto'}
      onLayout={(event) => setBox(event.nativeEvent.layout)}
    >
      <Animated.View
        testID="splash-background"
        style={[styles.purple, { backgroundColor: colors.splashBackground }, purpleStyle]}
      >
        <Animated.View testID="splash-gradient" style={[StyleSheet.absoluteFill, gradientStyle]}>
          <LinearGradient
            colors={colors.headerGradient as [string, string, ...string[]]}
            start={{ x: 0.37, y: 0 }}
            end={{ x: 0.63, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      <Animated.View
        testID="splash-name"
        style={[styles.name, nameStyle]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.middle}>
          {lines.map((line) => (
            <View
              key={line.text}
              testID="splash-line"
              // With Reduce Motion the logo doesn't rise, so the name sits lower, under it
              style={[styles.line, { top: line.top + (reduceMotion ? RISE : 0) }]}
            >
              {[...line.text].map((char, index) => (
                <Letter
                  key={`${char}${index}`}
                  char={char}
                  look={line.look}
                  delay={line.delay + index * duration.splashLetterStagger}
                />
              ))}
            </View>
          ))}
        </View>
      </Animated.View>

      <View testID="splash-logo-area" style={styles.centre}>
        <Animated.View testID="splash-logo" style={logoStyle}>
          <LogoMark size={LOGO_SIZE} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  purple: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  centre: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  // Scales from a point above the middle, as in the mockup
  name: { ...StyleSheet.absoluteFill, transformOrigin: '50% 40%' },
  middle: { position: 'absolute', top: '50%', left: 0, right: 0 },
  line: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
});
