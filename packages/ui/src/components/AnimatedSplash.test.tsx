import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, Platform } from 'react-native';
import { getAnimatedStyle as getStyle, useReducedMotion, withDelay, withTiming } from 'react-native-reanimated';
import type { getAnimatedStyle as NativeGetAnimatedStyle } from 'react-native-reanimated/lib/typescript/jestUtils/index.native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../theme';
import { brandTypography, lightColors, motion, radii, sizes } from '../tokens';
import { AnimatedSplash } from './AnimatedSplash';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
  withDelay: jest.fn(jest.requireActual('react-native-reanimated').withDelay),
  withTiming: jest.fn(jest.requireActual('react-native-reanimated').withTiming),
}));

// TypeScript sees Reanimated's web stub of getAnimatedStyle; Jest runs the native one
const getAnimatedStyle = getStyle as unknown as typeof NativeGetAnimatedStyle;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const { duration } = motion;
// The last letter of "MANAGER" is the seventh: it is fully drawn by then
const NAME_DONE = duration.splashNameDelay + duration.splashLineDelay + 6 * duration.splashLetterStagger + duration.splashLetter;
// Where Welcome's logo sits on a 390 x 844 phone
const WELCOME_LOGO = { x: 20, y: 91, width: sizes.logoHero, height: (sizes.logoHero * 233) / 198 };
// One frame of slack after an animation's end
const FRAME = 20;

function wrap(children: ReactNode) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider preference="light">{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

// Home's header on that phone at the default text size (homeHeaderLayout)
const HEADER = 371;

function splash(overrides: Partial<Parameters<typeof AnimatedSplash>[0]> = {}) {
  return <AnimatedSplash phase="waiting" target="header" headerHeight={HEADER} onFinished={jest.fn()} {...overrides} />;
}

const hidden = { includeHiddenElements: true };
const letters = () => screen.getAllByTestId('splash-letter', hidden);
const logo = () => screen.getByTestId('splash-logo');
const name = () => screen.getByTestId('splash-name', hidden);
const gradient = () => screen.getByTestId('splash-gradient');
const lineTops = () =>
  screen.getAllByTestId('splash-line', hidden).map((line) => (line.props.style as { top?: number }[])[1]?.top);

// Plays the intro, then starts the hand-over, as SplashGate does (1350 ms at the earliest)
async function handOver(overrides: Partial<Parameters<typeof AnimatedSplash>[0]>) {
  const view = await render(wrap(splash(overrides)));
  await jest.advanceTimersByTimeAsync(1350);
  await view.rerender(wrap(splash({ ...overrides, phase: 'leaving' })));

  return view;
}

describe('AnimatedSplash', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.mocked(useReducedMotion).mockReturnValue(false);
    jest.mocked(withDelay).mockClear();
    jest.mocked(withTiming).mockClear();
    Platform.OS = 'ios';
    jest.useRealTimers();
  });

  it('starts exactly like the native splash: the logo, 96 wide and centred, and no text', async () => {
    await render(wrap(splash()));

    // Flat purple: the header gradient isn't there yet
    expect(screen.getByTestId('splash-background')).toHaveStyle({ backgroundColor: lightColors.splashBackground });
    expect(gradient()).toHaveAnimatedStyle({ opacity: 0 });
    expect(screen.getByTestId('logo-mark').props.width).toBe(96);
    expect(screen.getByTestId('splash-logo-area')).toHaveStyle({ justifyContent: 'center', alignItems: 'center' });
    expect(logo()).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
    });

    for (const letter of letters()) {
      expect(letter).toHaveAnimatedStyle({ opacity: 0 });
    }
  });

  it('lifts the logo with a soft spring: a little past its spot, then back', async () => {
    await render(wrap(splash()));
    await jest.advanceTimersByTimeAsync(duration.splashRiseDelay + duration.splashRise * 0.55);

    const [, middle] = getAnimatedStyle(logo()).transform as [unknown, { translateY: number }];

    expect(middle.translateY).toBeLessThan(-60);

    await jest.advanceTimersByTimeAsync(duration.splashRise);

    expect(logo()).toHaveAnimatedStyle({ transform: [{ translateX: 0 }, { translateY: -60 }, { scale: 0.82 }] });
  });

  it('brings in the header gradient as the logo rises, as in the mockup', async () => {
    await render(wrap(splash()));
    await jest.advanceTimersByTimeAsync(duration.splashRiseDelay + duration.splashRise * 0.2);
    const { opacity } = getAnimatedStyle(gradient()) as { opacity: number };

    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);

    // It never goes past fully shown, even while the logo springs past its spot
    await jest.advanceTimersByTimeAsync(duration.splashRise * 0.35);

    expect(gradient()).toHaveAnimatedStyle({ opacity: 1 });

    await jest.advanceTimersByTimeAsync(duration.splashRise);

    expect(gradient()).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('writes the name in letter by letter: "Scaleway", then "MANAGER"', async () => {
    await render(wrap(splash()));

    expect(letters().map((letter) => letter.props.children).join('')).toBe('ScalewayMANAGER');

    // Just after the third letter of "Scaleway" starts
    await jest.advanceTimersByTimeAsync(duration.splashNameDelay + 2 * duration.splashLetterStagger + 30);
    const [first, second, third, ...rest] = letters().map((letter) => getAnimatedStyle(letter).opacity) as number[] &
      [number, number, number];

    expect(first).toBeGreaterThan(second);
    expect(second).toBeGreaterThan(third);
    expect(third).toBeGreaterThan(0);
    expect(rest).toEqual(Array(12).fill(0));

    // Each line starts at its own time, one stagger between letters
    expect(withDelay).toHaveBeenCalledWith(
      duration.splashNameDelay + 7 * duration.splashLetterStagger,
      expect.anything(),
    );
    expect(withDelay).toHaveBeenCalledWith(duration.splashNameDelay + duration.splashLineDelay, expect.anything());
    expect(withTiming).toHaveBeenCalledWith(1, { duration: duration.splashLetter, easing: expect.anything() });

    await jest.advanceTimersByTimeAsync(NAME_DONE);

    for (const letter of letters()) {
      expect(letter).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    }
  });

  it('brings the letters out of a blur on Android', async () => {
    Platform.OS = 'android';
    await render(wrap(splash()));

    expect(letters()[0]).toHaveAnimatedStyle({ filter: [{ blur: 10 }] });

    await jest.advanceTimersByTimeAsync(NAME_DONE + FRAME);

    expect(letters()[0]).toHaveAnimatedStyle({ filter: [{ blur: 0 }] });
  });

  it('on iOS, where React Native draws no blur, the letters only fade and rise', async () => {
    Platform.OS = 'ios';
    await render(wrap(splash()));

    for (const letter of letters()) {
      expect(getAnimatedStyle(letter)).not.toHaveProperty('filter');
    }
  });

  it('draws the name at a fixed size, in its two styles, hidden from screen readers', async () => {
    await render(wrap(splash()));

    expect(name().props.accessibilityElementsHidden).toBe(true);
    expect(name().props.importantForAccessibility).toBe('no-hide-descendants');
    expect(letters()[0]).toHaveStyle({ ...brandTypography.splashName, color: lightColors.onBrand });
    expect(letters()[8]).toHaveStyle({ ...brandTypography.splashNameLight, color: lightColors.onBrand });

    // Part of the brand mark: never bigger or smaller with the phone's text size
    for (const letter of letters()) {
      expect(letter.props.allowFontScaling).toBe(false);
    }
  });

  it('on Home, the purple shrinks into the header while the logo and name glide up and fade, then it fades', async () => {
    const onFinished = jest.fn();
    await handOver({ target: 'header', onFinished });
    await jest.advanceTimersByTimeAsync(duration.splashFadeOutDelay);

    // The logo and the name start fading 100 ms in, and are gone 300 ms later
    expect(logo()).toHaveAnimatedStyle({ opacity: 1 });
    expect(name()).toHaveAnimatedStyle({ opacity: 1 });

    await jest.advanceTimersByTimeAsync(duration.splashFadeOut + FRAME);

    expect(logo()).toHaveAnimatedStyle({ opacity: 0 });
    expect(name()).toHaveAnimatedStyle({ opacity: 0 });

    await jest.advanceTimersByTimeAsync(duration.splashHandOver - duration.splashFadeOutDelay - duration.splashFadeOut);

    expect(screen.getByTestId('splash-background')).toHaveAnimatedStyle({
      height: HEADER,
      borderBottomLeftRadius: radii.xl,
      borderBottomRightRadius: radii.xl,
    });
    expect(logo()).toHaveAnimatedStyle({ opacity: 0 });
    expect((getAnimatedStyle(logo()).transform as { translateY?: number }[])[1]).toEqual({ translateY: -290 });
    expect(name()).toHaveAnimatedStyle({ opacity: 0 });
    expect(onFinished).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(duration.splashPurpleFade + FRAME);

    expect(screen.getByTestId('splash-background')).toHaveAnimatedStyle({ opacity: 0 });
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("lands on the header height it's given, so it matches Home's header at every text size", async () => {
    await handOver({ target: 'header', headerHeight: 599 });
    await jest.advanceTimersByTimeAsync(duration.splashHandOver + FRAME);

    expect(screen.getByTestId('splash-background')).toHaveAnimatedStyle({ height: 599 });
  });

  it("on Welcome or the lock screen, the logo glides to that screen's logo while the purple fades", async () => {
    const onFinished = jest.fn();
    const { width, height } = Dimensions.get('window');
    await handOver({ target: 'screen', logoTarget: WELCOME_LOGO, onFinished });
    await jest.advanceTimersByTimeAsync(duration.splashHandOver - duration.splashPurpleFade);

    // The purple fades only in the last 200 ms, as the logo lands
    expect(screen.getByTestId('splash-background')).toHaveAnimatedStyle({ opacity: 1 });

    await jest.advanceTimersByTimeAsync(duration.splashPurpleFade + FRAME);

    expect(logo()).toHaveAnimatedStyle({
      opacity: 1,
      transform: [
        { translateX: WELCOME_LOGO.x + WELCOME_LOGO.width / 2 - width / 2 },
        { translateY: WELCOME_LOGO.y + WELCOME_LOGO.height / 2 - height / 2 },
        { scale: WELCOME_LOGO.width / 96 },
      ],
    });
    expect(name()).toHaveAnimatedStyle({ opacity: 0 });
    // Full height with square corners: round ones would show the page colour
    expect(screen.getByTestId('splash-background')).toHaveAnimatedStyle({
      height,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      opacity: 0,
    });
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('fades the logo out instead when the screen never said where its logo is', async () => {
    await handOver({ target: 'screen' });
    await jest.advanceTimersByTimeAsync(duration.splashHandOver + FRAME);

    expect(logo()).toHaveAnimatedStyle({ opacity: 0 });
    expect((getAnimatedStyle(logo()).transform as { translateX?: number }[])[0]).toEqual({ translateX: 0 });
  });

  it('fades the logo out where it is when the screen it glides to goes away mid-way', async () => {
    // Face ID unlocks during the hand-over: the lock screen is gone, Home is there instead
    const onFinished = jest.fn();
    const { rerender } = await handOver({ target: 'screen', logoTarget: WELCOME_LOGO, onFinished });
    await jest.advanceTimersByTimeAsync(200);
    await rerender(wrap(splash({ phase: 'leaving', target: 'header', onFinished })));
    await jest.advanceTimersByTimeAsync(duration.splashFadeOut + FRAME);

    expect(logo()).toHaveAnimatedStyle({ opacity: 0 });

    await jest.advanceTimersByTimeAsync(duration.splashHandOver);

    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('with Reduce Motion, the logo stays still and the whole name fades in under it, then everything fades out', async () => {
    const { unmount } = await render(wrap(splash()));
    const [scalewayTop, managerTop] = lineTops();
    await unmount();
    jest.mocked(withDelay).mockClear();
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const onFinished = jest.fn();
    const { rerender } = await render(wrap(splash({ onFinished })));
    const still = { opacity: 1, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };

    // One logo only, where the native splash put it; the name sits 60 pt lower, under it
    expect(screen.queryAllByTestId('logo-mark')).toHaveLength(1);
    expect(logo()).toHaveAnimatedStyle(still);
    expect(lineTops()).toEqual([(scalewayTop ?? 0) + 60, (managerTop ?? 0) + 60]);
    expect(name()).toHaveAnimatedStyle({ opacity: 0 });

    // No letters, no rise, no blur
    for (const letter of letters()) {
      expect(letter).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    }

    await jest.advanceTimersByTimeAsync(duration.splashRiseDelay + duration.base + FRAME);

    expect(logo()).toHaveAnimatedStyle(still);
    expect(name()).toHaveAnimatedStyle({ opacity: 1 });
    expect(withDelay).not.toHaveBeenCalledWith(duration.splashNameDelay, expect.anything());

    await rerender(wrap(splash({ phase: 'leaving', onFinished })));
    await jest.advanceTimersByTimeAsync(200);

    expect(onFinished).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(100);

    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('onFinished fires once even if the parent re-renders with a new callback', async () => {
    const first = jest.fn();
    const second = jest.fn();
    const third = jest.fn();
    const { rerender } = await render(wrap(splash({ phase: 'leaving', onFinished: first })));
    await jest.advanceTimersByTimeAsync(300);
    await rerender(wrap(splash({ phase: 'leaving', onFinished: second })));
    await jest.advanceTimersByTimeAsync(700);
    await rerender(wrap(splash({ phase: 'leaving', onFinished: third })));
    await jest.advanceTimersByTimeAsync(1000);

    expect(first.mock.calls.length + second.mock.calls.length + third.mock.calls.length).toBe(1);
  });

  it('holds the finished name while waiting, with no loading dots', async () => {
    const onFinished = jest.fn();
    await render(wrap(splash({ phase: 'waiting', onFinished })));
    await jest.advanceTimersByTimeAsync(5000);

    expect(onFinished).not.toHaveBeenCalled();
    expect(name()).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.queryByTestId('splash-dots', hidden)).toBeNull();
    expect(screen.queryByTestId('splash-dot', hidden)).toBeNull();
  });

  it('blocks taps while waiting and lets them through while leaving', async () => {
    const { rerender } = await render(wrap(splash({ phase: 'waiting' })));

    // A tap must not reach the hidden Welcome button or the tab bar
    expect(screen.getByTestId('splash').props.pointerEvents).toBe('auto');

    await rerender(wrap(splash({ phase: 'leaving' })));

    expect(screen.getByTestId('splash').props.pointerEvents).toBe('none');
  });
});
