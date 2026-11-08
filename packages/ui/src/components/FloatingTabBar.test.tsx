import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions } from 'react-native';
import { getAnimatedStyle as getStyle, useReducedMotion } from 'react-native-reanimated';
import type { getAnimatedStyle as NativeGetAnimatedStyle } from 'react-native-reanimated/lib/typescript/jestUtils/index.native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../theme';
import { compositeOver, contrastRatio, darkColors, lightColors, motion, radii, sizes, spacing } from '../tokens';
import type { SplashEntranceState } from './AnimatedSplashEntrance';
import { FloatingTabBar } from './FloatingTabBar';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

// TypeScript sees Reanimated's web stub of getAnimatedStyle; Jest runs the native one
const getAnimatedStyle = getStyle as unknown as typeof NativeGetAnimatedStyle;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const items = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'resources', icon: 'layers', label: 'Resources' },
  { key: 'billing', icon: 'chart', label: 'Billing' },
] as const;

// What a finger does before it lifts: Pressable shows its pressed look
const touch = { persist: () => {}, nativeEvent: { timestamp: 0, touches: [], changedTouches: [] } };

// The app's four tabs
const fourItems = [...items, { key: 'account', icon: 'user', label: 'Account' }] as const;

function wrap(children: ReactNode) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider preference="light">{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

// A window of this width (a phone, an iPad, a narrow split view)
const withWindowWidth = (width: number) =>
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width, height: 844, scale: 3, fontScale: 1 });

describe('FloatingTabBar', () => {
  it('renders one tab per item, labelled for screen readers', async () => {
    await render(wrap(<FloatingTabBar items={items} activeKey="home" onSelect={jest.fn()} />));

    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByLabelText('Home')).toBeTruthy();
    expect(screen.getByLabelText('Resources')).toBeTruthy();
    expect(screen.getByLabelText('Billing')).toBeTruthy();
  });

  it('groups the tabs in a tab list', async () => {
    await render(wrap(<FloatingTabBar items={items} activeKey="home" onSelect={jest.fn()} />));
    const row = screen.getByTestId('floating-tab-row');

    expect(row.props.accessibilityRole).toBe('tablist');
    expect(within(row).getAllByRole('tab')).toHaveLength(3);
  });

  it('marks only the active tab as selected', async () => {
    await render(wrap(<FloatingTabBar items={items} activeKey="resources" onSelect={jest.fn()} />));

    expect(screen.getByLabelText('Resources')).toBeSelected();
    expect(screen.getByLabelText('Home')).not.toBeSelected();
    expect(screen.getByLabelText('Billing')).not.toBeSelected();
  });

  it('pressing a tab calls onSelect with its key', async () => {
    const onSelect = jest.fn();

    await render(wrap(<FloatingTabBar items={items} activeKey="home" onSelect={onSelect} />));
    await fireEvent.press(screen.getByLabelText('Billing'));

    expect(onSelect).toHaveBeenCalledWith('billing');
  });

  it('a tab dims to 80% while pressed, like everything tappable', async () => {
    await render(wrap(<FloatingTabBar items={items} activeKey="home" onSelect={jest.fn()} />));
    const tab = screen.getByLabelText('Billing');
    await fireEvent(tab, 'responderGrant', touch);

    expect(tab).toHaveStyle({ opacity: 0.8 });
    expect(screen.getByLabelText('Home')).toHaveStyle({ opacity: 1 });
  });

  it('shows no visible text labels', async () => {
    await render(wrap(<FloatingTabBar items={items} activeKey="home" onSelect={jest.fn()} />));

    expect(screen.queryByText('Home')).toBeNull();
    expect(screen.getByLabelText('Home')).toBeTruthy();
  });

  it('sits above the home indicator', async () => {
    await render(wrap(<FloatingTabBar items={items} activeKey="home" onSelect={jest.fn()} />));

    expect(screen.getByTestId('floating-tab-bar')).toHaveStyle({ bottom: 34 });
  });

  describe('its shape', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('is a compact capsule, as wide as its tabs and centred, on a phone and on an iPad', async () => {
      // The owner's reference: three tabs, about 215 × 53 on a 402 pt phone
      withWindowWidth(402);
      const { unmount } = await render(wrap(<FloatingTabBar items={items} activeKey="home" onSelect={jest.fn()} />));

      expect(screen.getByTestId('floating-tab-bar')).toHaveStyle({
        width: 3 * sizes.tabItemWidth + 2 * spacing.xxs + 2,
        height: sizes.tabBarHeight,
        alignSelf: 'center',
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: lightColors.tabBarBorder,
      });
      expect(3 * sizes.tabItemWidth + 2 * spacing.xxs + 2).toBe(214);

      await unmount();

      // The app's four tabs: the same 282 on a phone and on an iPad, never stretched
      for (const width of [402, 1024]) {
        withWindowWidth(width);
        const { unmount: done } = await render(
          wrap(<FloatingTabBar items={fourItems} activeKey="home" onSelect={jest.fn()} />),
        );

        expect(screen.getByTestId('floating-tab-bar')).toHaveStyle({ width: 282, alignSelf: 'center' });

        await done();
      }
    });

    it("the active tab's capsule fills its slot, 4 pt inside the bar; the others show only their icon", async () => {
      await render(wrap(<FloatingTabBar items={fourItems} activeKey="billing" onSelect={jest.fn()} />));

      // The padding and the 1 pt border keep the capsule 5 pt from the bar's outer edge
      expect(screen.getByTestId('floating-tab-row')).toHaveStyle({
        flexDirection: 'row',
        padding: spacing.xxs,
        backgroundColor: lightColors.tabBarBackground,
      });
      expect(screen.getByLabelText('Billing')).toHaveStyle({
        width: sizes.tabItemWidth,
        height: sizes.tabItemHeight,
        borderRadius: radii.pill,
        backgroundColor: lightColors.tabActiveBackground,
      });

      for (const label of ['Home', 'Resources', 'Account']) {
        expect(screen.getByLabelText(label)).toHaveStyle({
          width: sizes.tabItemWidth,
          height: sizes.tabItemHeight,
          backgroundColor: 'transparent',
        });
      }

      // The active icon in its colour, the others muted
      const tree = JSON.stringify(screen.toJSON());

      expect(tree.split(`"stroke":"${lightColors.tabActiveIcon}"`)).toHaveLength(2);
      expect(tree.split(`"stroke":"${lightColors.tabIdleIcon}"`)).toHaveLength(4);
    });

    it('the capsule jumps to the tapped tab, with no motion of its own', async () => {
      const bar = (activeKey: string) => wrap(<FloatingTabBar items={fourItems} activeKey={activeKey} onSelect={jest.fn()} />);
      const { rerender } = await render(bar('home'));

      await rerender(bar('account'));

      expect(screen.getByLabelText('Account')).toHaveStyle({ backgroundColor: lightColors.tabActiveBackground });
      expect(screen.getByLabelText('Home')).toHaveStyle({ backgroundColor: 'transparent' });
      expect(getAnimatedStyle(screen.getByTestId('floating-tab-bar')).transform).toEqual([{ translateY: 0 }]);
    });

    it('on a very narrow window it keeps 36 pt from the sides, and its slots narrow but stay 44 pt to tap', async () => {
      // An iPad split view at its narrowest
      withWindowWidth(320);
      await render(wrap(<FloatingTabBar items={fourItems} activeKey="home" onSelect={jest.fn()} />));

      expect(screen.getByTestId('floating-tab-bar')).toHaveStyle({ width: 320 - 2 * sizes.tabBarInset });

      for (const tab of screen.getAllByRole('tab')) {
        expect(tab).toHaveStyle({ flexShrink: 1, minWidth: sizes.touchMin, height: sizes.tabItemHeight });
      }

      // Four slots still fit at 44 pt or more: (248 - 10) / 4
      expect((320 - 2 * sizes.tabBarInset - 2 * spacing.xxs - 2) / 4).toBeGreaterThanOrEqual(sizes.touchMin);
    });

    it.each([
      ['light', lightColors],
      ['dark', darkColors],
    ] as const)('%s: every icon reaches 3:1 against what is behind it', (_, colors) => {
      // The tab bar over the page; the capsule is opaque
      const bar = compositeOver(colors.tabBarBackground, colors.background);

      expect(contrastRatio(colors.tabActiveIcon, colors.tabActiveBackground)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(colors.tabIdleIcon, bar)).toBeGreaterThanOrEqual(3);
    });
  });

  describe('coming in after the splash', () => {
    // Below the screen's bottom edge: the bar's own height plus the room under it (34, the home indicator)
    const OFF_SCREEN = 34 + sizes.tabBarHeight;
    const { duration } = motion;
    const bar = (entrance?: SplashEntranceState) =>
      wrap(<FloatingTabBar items={items} activeKey="home" onSelect={jest.fn()} entrance={entrance} />);
    const slide = () =>
      (getAnimatedStyle(screen.getByTestId('floating-tab-bar')).transform as { translateY: number }[])[0]?.translateY;

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.mocked(useReducedMotion).mockReturnValue(false);
      jest.useRealTimers();
    });

    it('is simply there when no splash played', async () => {
      await render(bar());

      expect(slide()).toBe(0);
    });

    it('waits below the screen under the splash, then slides up as it leaves, with the cards', async () => {
      const { rerender } = await render(bar('hidden'));
      await jest.advanceTimersByTimeAsync(1000);

      expect(slide()).toBe(OFF_SCREEN);

      await rerender(bar('enter'));
      // It starts with the cards, 250 ms into the hand-over
      await jest.advanceTimersByTimeAsync(duration.splashEntranceDelay - 20);

      expect(slide()).toBe(OFF_SCREEN);

      await jest.advanceTimersByTimeAsync(120);

      expect(slide()).toBeGreaterThan(0);
      expect(slide()).toBeLessThan(OFF_SCREEN);

      await jest.advanceTimersByTimeAsync(duration.splashEntrance);

      expect(slide()).toBe(0);
    });

    it("keeps sliding in when the splash is gone before it's there", async () => {
      const { rerender } = await render(bar('hidden'));
      await rerender(bar('enter'));
      await jest.advanceTimersByTimeAsync(duration.splashEntranceDelay + 100);
      await rerender(bar('shown'));

      // No jump to the end
      expect(slide()).toBeGreaterThan(0);

      await jest.advanceTimersByTimeAsync(duration.splashEntrance);

      expect(slide()).toBe(0);
    });

    it('with Reduce Motion it is simply there as the splash fades: no slide', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
      const { rerender } = await render(bar('hidden'));
      await rerender(bar('enter'));
      // One frame, no wait
      await jest.advanceTimersByTimeAsync(20);

      expect(slide()).toBe(0);
    });
  });
});
