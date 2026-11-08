import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, processColor, StyleSheet } from 'react-native';
import { getAnimatedStyle as getStyle, ReduceMotion, useReducedMotion, withRepeat, withTiming } from 'react-native-reanimated';
import type { getAnimatedStyle as NativeGetAnimatedStyle } from 'react-native-reanimated/lib/typescript/jestUtils/index.native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { noticeLayout } from '../layout/noticeLayout';
import { ThemeProvider } from '../theme';
import {
  compositeOver,
  contrastRatio,
  darkColors,
  lightColors,
  motion,
  palette,
  radii,
  sizes,
  spacing,
  typography,
} from '../tokens';
import { AnimatedSplash } from './AnimatedSplash';
import { Button } from './Button';
import { FloatingNotice } from './FloatingNotice';
import { FloatingTabBar } from './FloatingTabBar';
import { HeaderBackground } from './HeaderBackground';
import { ListRow } from './ListRow';
import { Pill } from './Pill';
import { Screen } from './Screen';
import { Section } from './Section';
import { Stack } from './Stack';
import { Text } from './Text';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
  withRepeat: jest.fn(jest.requireActual('react-native-reanimated').withRepeat),
  withTiming: jest.fn(jest.requireActual('react-native-reanimated').withTiming),
}));

// TypeScript sees Reanimated's web stub of getAnimatedStyle; Jest runs the native one
const getAnimatedStyle = getStyle as unknown as typeof NativeGetAnimatedStyle;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const tabs = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'resources', icon: 'layers', label: 'Resources' },
] as const;

// The visible pill inside a button's touch box
function pill(name: string) {
  return within(screen.getByRole('button', { name })).getByTestId('button-pill');
}

function wrap(children: ReactNode, preference: 'light' | 'dark' = 'light') {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider preference={preference}>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('design-system hardening', () => {
  afterEach(() => {
    jest.mocked(useReducedMotion).mockReturnValue(false);
    jest.mocked(withRepeat).mockClear();
  });

  it('Stack lays out children in a row with the gap token', async () => {
    await render(
      wrap(
        <Stack direction="row" gap="sm">
          <Text variant="body">One</Text>

          <Text variant="body">Two</Text>
        </Stack>,
      ),
    );

    expect(screen.getByText('One').parent).toHaveStyle({ flexDirection: 'row', gap: 12 });
  });

  it('Stack pads with spacing tokens', async () => {
    await render(
      wrap(
        <Stack paddingHorizontal="md">
          <Text variant="body">Padded</Text>
        </Stack>,
      ),
    );

    expect(screen.getByText('Padded').parent).toHaveStyle({ paddingHorizontal: 16 });
  });

  it('Screen can draw under the status bar', async () => {
    await render(
      wrap(
        <Screen topInset="none">
          <Text variant="body">Header</Text>
        </Screen>,
      ),
    );

    expect(screen.getByTestId('screen-content')).toHaveStyle({ paddingTop: 0 });
  });

  it('Screen pads content horizontally by default', async () => {
    const { rerender } = await render(
      wrap(
        <Screen>
          <Text variant="body">Content</Text>
        </Screen>,
      ),
    );

    expect(screen.getByTestId('screen-content')).toHaveStyle({ paddingTop: 47, paddingHorizontal: 16 });

    await rerender(
      wrap(
        <Screen padded={false}>
          <Text variant="body">Content</Text>
        </Screen>,
      ),
    );

    expect(screen.getByTestId('screen-content')).toHaveStyle({ paddingHorizontal: 0 });
  });

  it('dark primary button label meets 4.5:1', async () => {
    await render(wrap(<Button label="Go" size="md" onPress={jest.fn()} />, 'dark'));

    expect(pill('Go')).toHaveStyle({ backgroundColor: darkColors.primaryButton });
    expect(screen.getByText('Go')).toHaveStyle({ color: darkColors.onPrimaryButton });
    expect(contrastRatio(darkColors.onPrimaryButton, darkColors.primaryButton)).toBeGreaterThanOrEqual(4.5);
  });

  it('light primary button label meets 4.5:1', async () => {
    await render(wrap(<Button label="Go" size="md" onPress={jest.fn()} />));

    expect(pill('Go')).toHaveStyle({ backgroundColor: lightColors.primaryButton });
    expect(screen.getByText('Go')).toHaveStyle({ color: lightColors.onPrimaryButton });
    expect(lightColors.primaryButton).toBe(palette.purple500);
    expect(lightColors.onPrimaryButton).toBe(palette.white);
    expect(contrastRatio(lightColors.onPrimaryButton, lightColors.primaryButton)).toBeGreaterThanOrEqual(4.5);
  });

  it('light idle tab icon meets 3:1 against the tab bar', async () => {
    await render(wrap(<FloatingTabBar items={tabs} activeKey="home" onSelect={jest.fn()} />));
    const bar = compositeOver(lightColors.tabBarBackground, lightColors.background);

    expect(JSON.stringify(screen.toJSON())).toContain(`"stroke":"${lightColors.tabIdleIcon}"`);
    expect(contrastRatio(lightColors.tabIdleIcon, bar)).toBeGreaterThanOrEqual(3);
  });

  it('small buttons reach 44pt with a real touch box', async () => {
    // A row of small buttons: a hitSlop would stick out of this 36 pt row and never react
    await render(
      wrap(
        <Stack direction="row" gap="xs">
          <Button label="Small" size="sm" onPress={jest.fn()} />

          <Button label="Other" size="sm" onPress={jest.fn()} />
        </Stack>,
      ),
    );
    const button = screen.getByRole('button', { name: 'Small' });

    expect(button).toHaveStyle({ minHeight: sizes.touchMin });
    expect(button.props.hitSlop).toBeUndefined();
    expect(pill('Small')).toHaveStyle({ minHeight: sizes.buttonSm });
  });

  it('tab items are 44pt touch areas themselves, inside the bar', async () => {
    await render(wrap(<FloatingTabBar items={tabs} activeKey="home" onSelect={jest.fn()} />));

    for (const tab of screen.getAllByRole('tab')) {
      // The whole slot takes touches: no hitSlop, which would have to fit inside the bar to react
      expect(tab.props.hitSlop).toBeUndefined();
      expect(tab).toHaveStyle({ width: sizes.tabItemWidth, height: sizes.tabItemHeight, minWidth: sizes.touchMin });
      expect(sizes.tabItemWidth).toBeGreaterThanOrEqual(sizes.touchMin);
      expect(sizes.tabItemHeight).toBeGreaterThanOrEqual(sizes.touchMin);
      // It fits in the bar: 4 pt of padding and the 1 pt border above and below
      expect(sizes.tabItemHeight + 2 * spacing.xxs + 2).toBe(sizes.tabBarHeight);
    }
  });

  it('the splash has no loading dots and nothing that loops, with or without Reduce Motion', async () => {
    const splash = <AnimatedSplash phase="waiting" target="header" headerHeight={371} onFinished={jest.fn()} />;
    const { unmount } = await render(wrap(splash));

    expect(screen.queryByTestId('splash-dots', { includeHiddenElements: true })).toBeNull();
    expect(withRepeat).not.toHaveBeenCalled();

    await unmount();
    jest.mocked(useReducedMotion).mockReturnValue(true);
    await render(wrap(splash));

    expect(screen.queryByTestId('splash-dots', { includeHiddenElements: true })).toBeNull();
    expect(withRepeat).not.toHaveBeenCalled();
  });

  it('ListRow reads its subtitle to screen readers', async () => {
    await render(
      wrap(
        <>
          <ListRow
            title="Reboot"
            subtitle="You're offline"
            trailing={{ type: 'chevron' }}
            onPress={jest.fn()}
            disabled
          />

          <ListRow title="Version" trailing={{ type: 'text', text: '3.0.0' }} />
        </>,
      ),
    );

    expect(screen.getByRole('button', { name: "Reboot, You're offline" })).toBeOnTheScreen();
    expect(screen.getByLabelText('Version, 3.0.0')).toBeOnTheScreen();
  });

  it('Section title is a header', async () => {
    await render(
      wrap(
        <Section title="Security">
          <ListRow title="Lock after" />
        </Section>,
      ),
    );

    // Shown in capitals, read in its own case so it isn't spelled out
    expect(screen.getByText('SECURITY')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Security' })).toBeOnTheScreen();
  });

  it('contrastRatio matches known pairs', () => {
    /* eslint-disable no-restricted-syntax -- WCAG reference values, not app colours */
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    // rgba is laid over the background first
    expect(contrastRatio('rgba(0,0,0,0)', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('rgba(0, 0, 0, 1)', '#FFFFFF')).toBeCloseTo(21, 5);
    /* eslint-enable no-restricted-syntax */
  });

  it('HeaderBackground keeps its content clear of the status bar', async () => {
    const notch = { ...metrics, insets: { ...metrics.insets, top: 59 } };
    const header = (insetTop?: boolean) => (
      <SafeAreaProvider initialMetrics={notch}>
        <ThemeProvider preference="light">
          <HeaderBackground insetTop={insetTop}>
            <Text variant="title">Scaleway Manager</Text>
          </HeaderBackground>
        </ThemeProvider>
      </SafeAreaProvider>
    );
    const { rerender } = await render(header(true));
    const gradient = StyleSheet.flatten(screen.getByTestId('header-gradient').props.style);

    expect(screen.getByTestId('header-content')).toHaveStyle({ paddingTop: 59 });
    // The gradient itself still starts at the very top
    expect(gradient.paddingTop ?? 0).toBe(0);
    expect(gradient.marginTop ?? 0).toBe(0);
    expect(gradient.top ?? 0).toBe(0);

    await rerender(header());

    expect(screen.getByTestId('header-content')).toHaveStyle({ paddingTop: 0 });
  });

  it('HeaderBackground dots: a still grid of small white dots behind the content, hidden and not touchable', async () => {
    const header = (dots?: boolean, preference: 'light' | 'dark' = 'light') =>
      wrap(
        <HeaderBackground fill dots={dots}>
          <Text variant="title">Scaleway Manager</Text>
        </HeaderBackground>,
        preference,
      );
    const { rerender } = await render(header(true));
    const layer = screen.getByTestId('header-dots', { includeHiddenElements: true });
    const steps = screen.getAllByTestId('header-dots-step', { includeHiddenElements: true });
    const siblings = screen.getByTestId('header-content').parent?.children ?? [];

    expect(layer.props).toMatchObject({
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
      pointerEvents: 'none',
    });
    expect(layer).toHaveStyle({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
    // Drawn first, so the words and buttons sit on top of it
    expect(siblings.indexOf(layer)).toBeLessThan(siblings.indexOf(screen.getByTestId('header-content')));
    // White dots of radius 1.5, fading in steps up to 42% in the middle of the oval
    for (const step of steps) {
      expect(step.props.fill).toEqual({ type: 0, payload: processColor(lightColors.onBrand) });
    }

    expect(steps.map((step) => step.props.fillOpacity).at(-1)).toBeCloseTo(0.42);
    expect(String(steps.at(-1)?.props.d)).toContain('a1.5,1.5 0 1,0 3,0');
    // Nothing at the very top, where the title and its line sit
    expect(steps.some((step) => /M[\d.]+,(?:[0-9]|[1-9][0-9]|1[0-9][0-9])a/.test(String(step.props.d)))).toBe(false);

    await rerender(header(true, 'dark'));

    // A little fainter on the darker purple
    expect(
      screen.getAllByTestId('header-dots-step', { includeHiddenElements: true }).map((step) => step.props.fillOpacity).at(-1),
    ).toBeCloseTo(0.34);

    await rerender(header());

    expect(screen.queryByTestId('header-dots', { includeHiddenElements: true })).toBeNull();
  });

  describe('HeaderBackground noticeShown (Home, Billing): the content makes room for the floating notice', () => {
    const { fontScale } = Dimensions.get('window');
    // Where the content starts: under the status bar, or under the notice (the offline pill, the Demo badge)
    const online = metrics.insets.top;
    const offline = noticeLayout(metrics.insets.top, fontScale).clearance;
    // Its padding (the status bar) plus the room it slid down by
    const start = () =>
      Number(StyleSheet.flatten(content().props.style).paddingTop) + Number(getAnimatedStyle(content()).marginTop ?? 0);
    const header = (noticeShown: boolean) =>
      wrap(
        <HeaderBackground insetTop noticeShown={noticeShown}>
          <Text variant="subhead">Acme · Production</Text>
        </HeaderBackground>,
      );
    const content = () => screen.getByTestId('header-content');

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.mocked(useReducedMotion).mockReturnValue(false);
      jest.useRealTimers();
    });

    it('online, the content starts right under the status bar: no room kept for a pill that is not there', async () => {
      await render(header(false));

      expect(start()).toBe(online);
      expect(content()).toHaveAnimatedStyle({ opacity: 1 });
    });

    it('offline, the content slides down by the pill\'s room, and back up once the pill is gone', async () => {
      const { rerender } = await render(header(false));

      await rerender(header(true));
      await jest.advanceTimersByTimeAsync(motion.duration.base / 2);
      const halfway = start();

      // A slide, not a jump
      expect(halfway).toBeGreaterThan(online);
      expect(halfway).toBeLessThan(offline);

      await jest.advanceTimersByTimeAsync(motion.duration.base);

      expect(start()).toBe(offline);
      expect(content()).toHaveAnimatedStyle({ opacity: 1 });

      await rerender(header(false));
      await jest.advanceTimersByTimeAsync(motion.duration.base + 20);

      expect(start()).toBe(online);
    });

    it('a network that drops and comes back mid-slide turns around from where it is, then settles under the status bar', async () => {
      const { rerender } = await render(header(false));

      await rerender(header(true));
      await jest.advanceTimersByTimeAsync(100);
      const turned = start();

      await rerender(header(false));
      await jest.advanceTimersByTimeAsync(60);
      const back = start();

      // No jump to either end: it heads back up from where it was
      expect(turned).toBeGreaterThan(online);
      expect(turned).toBeLessThan(offline);
      expect(back).toBeLessThan(turned);
      expect(back).toBeGreaterThan(online);

      await jest.advanceTimersByTimeAsync(motion.duration.base);

      expect(start()).toBe(online);
    });

    it('opened while the notice is already up (offline at launch), it starts in its place: no slide', async () => {
      await render(header(true));

      expect(start()).toBe(offline);
      expect(content()).toHaveAnimatedStyle({ opacity: 1 });
    });

    it('with Reduce Motion it doesn\'t slide: it is in its new place at once and fades in (250 ms at most)', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
      const { rerender } = await render(header(false));

      await rerender(header(true));
      await jest.advanceTimersByTimeAsync(20);

      expect(start()).toBe(offline);
      expect(getAnimatedStyle(content()).opacity as number).toBeLessThan(1);

      await jest.advanceTimersByTimeAsync(motion.duration.base);

      expect(start()).toBe(offline);
      expect(content()).toHaveAnimatedStyle({ opacity: 1 });
      expect(motion.duration.base).toBeLessThanOrEqual(250);
      // This fade is the Reduce Motion path itself, so Reanimated mustn't skip it for the system setting
      expect(withTiming).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ duration: motion.duration.base, reduceMotion: ReduceMotion.Never }),
      );
    });
  });

  it('HeaderBackground overlapped keeps its content clear of the cards that overlap its bottom', async () => {
    const { rerender } = await render(wrap(<HeaderBackground overlapped insetBottom />));

    // The 28 pt the cards cover (Stack overlapHeader), plus the usual 16 pt gap, on top of the bottom inset
    expect(screen.getByTestId('header-content')).toHaveStyle({
      paddingBottom: metrics.insets.bottom + radii.xl + spacing.md,
    });

    await rerender(wrap(<HeaderBackground />));

    expect(screen.getByTestId('header-content')).toHaveStyle({ paddingBottom: 0 });
  });

  it('HeaderBackground minHeight is a floor: it grows when its content needs more, so no word is cut', async () => {
    await render(wrap(<HeaderBackground minHeight={371} />));
    const style = StyleSheet.flatten(screen.getByTestId('header-gradient').props.style);

    expect(style.minHeight).toBe(371);
    expect(style.height).toBeUndefined();
  });

  it('dark onBrand button label meets 4.5:1', async () => {
    await render(wrap(<Button label="Log in" size="md" variant="onBrand" onPress={jest.fn()} />, 'dark'));

    expect(pill('Log in')).toHaveStyle({ backgroundColor: darkColors.onBrand });
    expect(screen.getByText('Log in')).toHaveStyle({ color: darkColors.primaryButton });
    expect(contrastRatio(darkColors.primaryButton, darkColors.onBrand)).toBeGreaterThanOrEqual(4.5);
  });

  it('Stack overlaps the header by the header radius', async () => {
    await render(
      wrap(
        <Stack overlapHeader>
          <Text variant="body">By product</Text>
        </Stack>,
      ),
    );

    expect(screen.getByText('By product').parent).toHaveStyle({ marginTop: -radii.xl });
  });

  it('HeaderBackground can fill the screen and keep its content clear of the home indicator', async () => {
    const notch = { ...metrics, insets: { ...metrics.insets, top: 59 } };

    // The Welcome recipe
    await render(
      <SafeAreaProvider initialMetrics={notch}>
        <ThemeProvider preference="light">
          <Screen topInset="none" bottomInset="none" padded={false} withTabBar={false} scroll={false}>
            <HeaderBackground fill insetTop insetBottom>
              <Text variant="title">Scaleway Manager</Text>
            </HeaderBackground>
          </Screen>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    // The purple reaches both edges of the screen
    expect(screen.getByTestId('screen-content')).toHaveStyle({ paddingTop: 0, paddingBottom: 0 });
    expect(screen.getByTestId('header-gradient')).toHaveStyle({ flex: 1 });
    // Its content stays clear of the status bar and the home indicator
    expect(screen.getByTestId('header-content')).toHaveStyle({ paddingTop: 59, paddingBottom: 34 });
  });

  it('ghostOnBrand label meets 4.5:1 on every header gradient stop', async () => {
    for (const [preference, colors] of [
      ['light', lightColors],
      ['dark', darkColors],
    ] as const) {
      const { unmount } = await render(
        wrap(
          <Button label="Try the demo" size="md" variant="ghostOnBrand" onPress={jest.fn()} />,
          preference,
        ),
      );
      const label = StyleSheet.flatten(screen.getByText('Try the demo').props.style).color;

      expect(label).toBe(colors.onBrand);
      expect(pill('Try the demo')).toHaveStyle({ backgroundColor: 'transparent' });

      for (const stop of colors.headerGradient) {
        expect(contrastRatio(label, stop)).toBeGreaterThanOrEqual(4.5);
      }

      await unmount();
    }
  });

  it('a full-height header has square bottom corners', async () => {
    const { rerender } = await render(wrap(<HeaderBackground fill />));

    // It reaches the bottom of the screen, so round corners would show the page colour
    expect(screen.getByTestId('header-gradient')).toHaveStyle({ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 });

    await rerender(wrap(<HeaderBackground minHeight={371} />));

    expect(screen.getByTestId('header-gradient')).toHaveStyle({
      borderBottomLeftRadius: radii.xl,
      borderBottomRightRadius: radii.xl,
    });
  });

  it('a scrolling screen with its header under the status bar paints purple above its top', async () => {
    const { height } = Dimensions.get('window');
    const home = (preference: 'light' | 'dark') =>
      wrap(
        <Screen topInset="none" padded={false}>
          <HeaderBackground minHeight={371} insetTop />
        </Screen>,
        preference,
      );
    const { rerender } = await render(home('light'));

    // Pulling the screen down past its top (iOS) shows this purple, not the page, so the light status bar stays readable
    expect(screen.getByTestId('screen-overscroll')).toHaveStyle({
      position: 'absolute',
      top: -height,
      height,
      left: 0,
      right: 0,
    });

    // The header says how tall it really is (it grows with its content)
    await fireEvent(screen.getByTestId('header-gradient'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 420 } },
    });

    // It continues the header's gradient upwards (same colours, same slant), so no colour edge shows
    expect(screen.getByTestId('screen-overscroll').props).toMatchObject({
      colors: lightColors.headerGradient.map((color) => processColor(color)),
      startPoint: [0.37, 1],
      endPoint: [0.63, 1 + 420 / height],
    });

    await rerender(home('dark'));

    expect(screen.getByTestId('screen-overscroll').props.colors).toEqual(darkColors.headerGradient.map((color) => processColor(color)));

    // No header at the top, or a screen that can't be pulled: nothing to paint
    await rerender(wrap(<Screen><Text variant="body">Account</Text></Screen>));

    expect(screen.queryByTestId('screen-overscroll')).not.toBeOnTheScreen();

    await rerender(wrap(<Screen topInset="none" padded={false} scroll={false}><HeaderBackground fill insetTop /></Screen>));

    expect(screen.queryByTestId('screen-overscroll')).not.toBeOnTheScreen();
  });

  it('Screen tells how tall its header really is, each time that changes (the splash lands on it)', async () => {
    const onHeaderHeight = jest.fn();
    await render(
      wrap(
        <Screen topInset="none" padded={false} onHeaderHeight={onHeaderHeight}>
          <HeaderBackground minHeight={335} insetTop />
        </Screen>,
      ),
    );
    const layOut = (height: number) =>
      fireEvent(screen.getByTestId('header-gradient'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
      });

    await layOut(335);
    await layOut(335);
    // A long name wrapped, or the content made room for the offline pill
    await layOut(371);

    expect(onHeaderHeight.mock.calls).toEqual([[335], [371]]);
  });

  it("Screen can start below the offline pill, and doesn't move when the pill comes and goes", async () => {
    const { fontScale } = Dimensions.get('window');
    // The pill: its caption lines (one more per step of text size, for the long label) or its icon, plus its padding
    const lines = Math.ceil(fontScale);
    const pill = Math.max(sizes.iconSm, lines * typography.caption.lineHeight * fontScale) + 2 * spacing.xxs;
    const pillBottom = metrics.insets.top + spacing.xxs + pill;
    const account = (offline: boolean) =>
      wrap(
        <>
          <Screen topInset="belowNotice">
            <Text variant="body">Security</Text>
          </Screen>

          {offline ? (
            <FloatingNotice>
              <Pill tone="inverse" icon="wifi-off" label="You're offline" />
            </FloatingNotice>
          ) : null}
        </>,
      );
    const { rerender } = await render(account(true));

    expect(screen.getByTestId('floating-notice')).toHaveStyle({ top: metrics.insets.top + spacing.xxs });
    expect(screen.getByTestId('screen-content')).toHaveStyle({ paddingTop: pillBottom + spacing.xs });

    await rerender(account(false));

    expect(screen.getByTestId('screen-content')).toHaveStyle({ paddingTop: pillBottom + spacing.xs });
  });
});
