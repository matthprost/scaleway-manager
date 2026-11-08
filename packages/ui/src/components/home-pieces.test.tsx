import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AccessibilityInfo, Dimensions, Platform, StyleSheet } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { getAnimatedStyle as getStyle, useReducedMotion } from 'react-native-reanimated';
import type { getAnimatedStyle as NativeGetAnimatedStyle } from 'react-native-reanimated/lib/typescript/jestUtils/index.native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../theme';
import { compositeOver, contrastRatio, darkColors, lightColors, motion, sizes, spacing, typography } from '../tokens';
import type { Product, ThemeColors } from '../tokens';
import { AlertRow } from './AlertRow';
import { BreakdownBar } from './BreakdownBar';
import { Card } from './Card';
import { Carousel } from './Carousel';
import { HealthDot } from './HealthDot';
import type { Health } from './HealthDot';
import { Icon } from './Icon';
import { NoticeCard } from './NoticeCard';
import { PickerChip, pickerChipHeight } from './PickerChip';
import { ResourceCard } from './ResourceCard';
import { SectionHeader } from './SectionHeader';
import { SegmentedControl, segmentedControlHeight } from './SegmentedControl';
import { StatusLine } from './StatusLine';
import { Text } from './Text';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const themes = [
  ['light', lightColors],
  ['dark', darkColors],
] as const;

function wrap(children: ReactNode, preference: 'light' | 'dark' = 'light') {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider preference={preference}>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

// What a finger does before it lifts: Pressable shows its pressed look
const touch = { persist: () => {}, nativeEvent: { timestamp: 0, touches: [], changedTouches: [] } };

// A phone (390 pt wide) or an iPad (1024 pt), at a given text size
const withWindow = (width: number, fontScale: number) =>
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width, height: 844, scale: 3, fontScale });

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

// TypeScript sees Reanimated's web stub of getAnimatedStyle; Jest runs the native one
const getAnimatedStyle = getStyle as unknown as typeof NativeGetAnimatedStyle;

// Jest doesn't lay views out: tell a two-choice switch where its segments are
const layOutSegments = async () => {
  const [first, second] = screen.getAllByTestId('segment');

  await fireEvent(first as never, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 44, height: 44 } } });
  await fireEvent(second as never, 'layout', { nativeEvent: { layout: { x: 44, y: 0, width: 50, height: 44 } } });
};

const THREE = [
  { key: '3M', label: '3M' },
  { key: '6M', label: '6M' },
  { key: '12M', label: '12M' },
] as const;

const RANGES = [
  { key: '6M', label: '6M' },
  { key: '12M', label: '12M' },
] as const;

const NOVEMBER = [
  { label: 'Instances', value: 4630, formatted: '€46.30' },
  { label: 'Kubernetes', value: 2110, formatted: '€21.10' },
  { label: 'Databases', value: 1120, formatted: '€11.20' },
  { label: 'Other', value: 600, formatted: '€6.00' },
];

// The touch box around a shape that looks compactControl high
const slack = (sizes.touchMin - sizes.compactControl) / 2;

// The flattened style of a rendered element
const style = (element: { props: { style?: unknown } }): TextStyle =>
  StyleSheet.flatten(element.props.style as StyleProp<TextStyle>) ?? {};

const HEALTH_COLOURS: Record<Health, (colors: ThemeColors) => string> = {
  ok: (colors) => colors.success,
  // The same purple as its Pill
  busy: (colors) => colors.primaryButton,
  warning: (colors) => colors.warning,
  error: (colors) => colors.alertText,
  stopped: (colors) => colors.neutral,
};

const HEALTH_PILLS: Record<Health, (colors: ThemeColors) => { background: string; text: string }> = {
  ok: (colors) => ({ background: colors.successBadge, text: colors.onBadge }),
  busy: (colors) => ({ background: colors.primaryButton, text: colors.onBadge }),
  warning: (colors) => ({ background: colors.warningBadge, text: colors.onBadge }),
  error: (colors) => ({ background: colors.dangerBadge, text: colors.onBadge }),
  stopped: (colors) => ({ background: colors.neutralBadge, text: colors.onBadge }),
};

const PRODUCTS: readonly Product[] = [
  'instances',
  'elastic-metal',
  'kubernetes',
  'databases',
  'containers',
  'functions',
  'jobs',
  'load-balancers',
];

// How many icons in the tree are drawn in this colour
const strokes = (color: string) => JSON.stringify(screen.toJSON()).split(`"stroke":"${color}"`).length - 1;

// How many of them are filled with it (the pinned star); every other icon is an outline
const fills = (color: string) => JSON.stringify(screen.toJSON()).split(`"fill":"${color}"`).length - 1;

function resourceCard(overrides: Partial<Parameters<typeof ResourceCard>[0]> = {}) {
  return (
    <ResourceCard
      product="instances"
      title="web-prod-1"
      subtitle="Instance · Ubuntu"
      meta="fr-par-1 · 51.15.12.34"
      statusLabel="Running"
      health="ok"
      onPress={jest.fn()}
      {...overrides}
    />
  );
}

describe('Home pieces', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('SegmentedControl', () => {
    it("segmentedControlHeight is the switch's own height: its segment's padding, its pill's padding and its line", async () => {
      const { fontScale } = Dimensions.get('window');
      await render(wrap(<SegmentedControl options={RANGES} value="6M" onChange={jest.fn()} tone="onBrand" />));
      const segment = style(screen.getAllByTestId('segment')[0] ?? screen.getByText('6M'));
      const pill = style(screen.getAllByTestId('segment-pill')[0] ?? screen.getByText('6M'));
      const line = style(screen.getByText('6M')).lineHeight ?? 0;
      const drawn = 2 * Number(segment.paddingVertical) + 2 * Number(pill.paddingVertical) + line * fontScale;

      expect(segmentedControlHeight(fontScale)).toBe(Math.max(sizes.touchMin, drawn));
      expect(segmentedControlHeight(1)).toBe(sizes.touchMin);
    });

    it('segments may shrink (flexShrink 1), so words wider than the room share it instead of running off', async () => {
      const VIEWS = [
        { key: 'products', label: 'Products' },
        { key: 'projects', label: 'Projects' },
      ] as const;
      const { unmount } = await render(wrap(<SegmentedControl options={VIEWS} value="products" onChange={jest.fn()} />));

      for (const segment of screen.getAllByTestId('segment')) {
        expect(segment).toHaveStyle({ flexShrink: 1 });
      }

      await unmount();
      await render(wrap(<SegmentedControl options={[...VIEWS, { key: 'all', label: 'All' }]} value="all" onChange={jest.fn()} />));

      for (const tab of screen.getAllByRole('tab')) {
        expect(tab).toHaveStyle({ flexShrink: 1 });
      }
    });

    it('SegmentedControl calls onChange with the tapped key', async () => {
      const onChange = jest.fn();
      await render(wrap(<SegmentedControl options={RANGES} value="6M" onChange={onChange} tone="onBrand" />));
      await fireEvent.press(screen.getByText('12M'));

      expect(onChange).toHaveBeenCalledWith('12M');
    });

    it('with two choices, a tap on the picked side switches to the other one', async () => {
      const onChange = jest.fn();
      await render(wrap(<SegmentedControl options={RANGES} value="6M" onChange={onChange} />));
      await fireEvent.press(screen.getByText('6M'));

      expect(onChange).toHaveBeenCalledWith('12M');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('with two choices, a tap on the other side switches too, both ways', async () => {
      const onChange = jest.fn();
      const { rerender } = await render(wrap(<SegmentedControl options={RANGES} value="6M" onChange={onChange} />));
      await fireEvent.press(screen.getByText('12M'));

      expect(onChange).toHaveBeenLastCalledWith('12M');

      await rerender(wrap(<SegmentedControl options={RANGES} value="12M" onChange={onChange} />));
      await fireEvent.press(screen.getByText('12M'));

      expect(onChange).toHaveBeenLastCalledWith('6M');
      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('two fast taps before it re-renders both ask for the same other choice', async () => {
      const onChange = jest.fn();
      await render(wrap(<SegmentedControl options={RANGES} value="6M" onChange={onChange} />));
      const control = screen.getByRole('button');

      await act(async () => {
        fireEvent.press(control);
        fireEvent.press(control);
      });

      expect(onChange.mock.calls).toEqual([['12M'], ['12M']]);
    });

    it('announces the new choice once after a tap, with the group name', async () => {
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
      announce.mockClear();
      const options = [
        { key: '6M', label: '6M', accessibilityLabel: '6 months' },
        { key: '12M', label: '12M', accessibilityLabel: '12 months' },
      ] as const;
      await render(
        wrap(<SegmentedControl options={options} value="6M" onChange={jest.fn()} accessibilityLabel="Range" />),
      );
      await fireEvent.press(screen.getByRole('button'));

      expect(announce.mock.calls).toEqual([['Range: 12 months']]);
    });

    it('with three choices it is one tab list, the picked tab selected; tapping it again changes nothing', async () => {
      const onChange = jest.fn();
      await render(wrap(<SegmentedControl options={THREE} value="6M" onChange={onChange} />));

      // Like the FloatingTabBar: one control with its choices, "1 of 3" (a tab list isn't focused itself)
      const list = screen.getByTestId('segmented-control');

      expect(list.props.accessibilityRole).toBe('tablist');
      expect(within(list).getAllByRole('tab')).toHaveLength(3);
      expect(screen.queryByRole('button')).not.toBeOnTheScreen();
      expect(screen.getByRole('tab', { name: '6M' }).props.accessibilityState.selected).toBe(true);
      expect(screen.getByRole('tab', { name: '12M' }).props.accessibilityState.selected).toBe(false);

      await fireEvent.press(screen.getByRole('tab', { name: '6M' }));

      expect(onChange).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByRole('tab', { name: '3M' }));

      expect(onChange).toHaveBeenCalledWith('3M');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('with three choices the picked segment has the pill itself and nothing slides', async () => {
      await render(wrap(<SegmentedControl options={THREE} value="12M" onChange={jest.fn()} tone="onBrand" />));
      const pills = screen.getAllByTestId('segment-pill');

      expect(screen.queryByTestId('segmented-slider')).not.toBeOnTheScreen();
      expect(pills[2]).toHaveStyle({ backgroundColor: lightColors.onBrand, borderRadius: 999 });
      expect(pills[1]).toHaveStyle({ backgroundColor: 'transparent' });
    });

    it('with two choices it is one button: its label says the picked choice, its hint the other, and the label follows the value', async () => {
      const options = [
        { key: '6M', label: '6M', accessibilityLabel: '6 months' },
        { key: '12M', label: '12M', accessibilityLabel: '12 months' },
      ] as const;
      const { rerender } = await render(
        wrap(<SegmentedControl options={options} value="6M" onChange={jest.fn()} accessibilityLabel="Range" />),
      );
      const control = screen.getByRole('button', { name: 'Range: 6 months' });

      expect(control.props.accessibilityHint).toBe('Double-tap to show 12 months');
      expect(screen.queryByRole('tab')).not.toBeOnTheScreen();

      await rerender(
        wrap(<SegmentedControl options={options} value="12M" onChange={jest.fn()} accessibilityLabel="Range" />),
      );

      expect(screen.getByRole('button', { name: 'Range: 12 months' }).props.accessibilityHint).toBe(
        'Double-tap to show 6 months',
      );
    });

    it('with two choices and no group label, the button is named after the picked choice, said in its own words', async () => {
      const options = [
        { key: '6M', label: '6M', accessibilityLabel: '6 months' },
        { key: '12M', label: '12M' },
      ] as const;
      await render(wrap(<SegmentedControl options={options} value="12M" onChange={jest.fn()} />));

      expect(screen.getByRole('button', { name: '12M' }).props.accessibilityHint).toBe('Double-tap to show 6 months');
    });

    it('three choices say their own words to screen readers', async () => {
      const options = [
        { key: '3M', label: '3M', accessibilityLabel: '3 months' },
        { key: '6M', label: '6M', accessibilityLabel: '6 months' },
        { key: '12M', label: '12M', accessibilityLabel: '12 months' },
      ] as const;
      await render(wrap(<SegmentedControl options={options} value="6M" onChange={jest.fn()} tone="onBrand" />));

      expect(screen.getByRole('tab', { name: '6 months' })).toBeOnTheScreen();
      expect(screen.getByText('6M')).toBeOnTheScreen();
    });

    it('the picked label waits for its pill: no purple label on the bare track before the first layout', async () => {
      await render(wrap(<SegmentedControl options={RANGES} value="6M" onChange={jest.fn()} tone="onBrand" />));

      expect(screen.getByText('6M')).toHaveStyle({ color: lightColors.onBrand });

      await layOutSegments();

      expect(screen.getByText('6M')).toHaveStyle({ color: lightColors.primaryButton });
    });

    describe('the white pill slides', () => {
      const { duration } = motion;
      const frame = (x: number, width: number) => ({ nativeEvent: { layout: { x, y: 0, width, height: 44 } } });
      const layOut = async () => {
        const [first, second] = screen.getAllByTestId('segment');

        await fireEvent(first as never, 'layout', frame(0, 44));
        await fireEvent(second as never, 'layout', frame(44, 50));
        await jest.advanceTimersByTimeAsync(20);
      };
      const pill = () => getAnimatedStyle(screen.getByTestId('segmented-slider'));
      const control = (value: '6M' | '12M') =>
        wrap(<SegmentedControl options={RANGES} value={value} onChange={jest.fn()} tone="onBrand" />);

      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.mocked(useReducedMotion).mockReturnValue(false);
        jest.useRealTimers();
      });

      it('sits on the picked segment from the start, inside the track, a white pill', async () => {
        await render(control('12M'));
        await layOut();

        expect(pill()).toMatchObject({ left: 44 + 2, width: 50 - 4 });
        expect(screen.getByTestId('segmented-slider')).toHaveStyle({
          backgroundColor: lightColors.onBrand,
          borderRadius: 999,
          top: slack + 2,
          bottom: slack + 2,
        });
        expect(screen.getAllByTestId('segment-pill')[1]).toHaveStyle({ backgroundColor: 'transparent' });
      });

      it('glides to the new side over the base duration', async () => {
        const { rerender } = await render(control('6M'));
        await layOut();

        expect(pill()).toMatchObject({ left: 2, width: 40 });

        await rerender(control('12M'));
        await jest.advanceTimersByTimeAsync(duration.base / 2);

        const middle = Number(pill().left);

        expect(middle).toBeGreaterThan(2);
        expect(middle).toBeLessThan(46);

        await jest.advanceTimersByTimeAsync(duration.base);

        expect(pill()).toMatchObject({ left: 46, width: 46 });
      });

      it('a new size from a text size change moves the pill at once, without sliding', async () => {
        await render(control('6M'));
        await layOut();

        const [first] = screen.getAllByTestId('segment');

        await fireEvent(first as never, 'layout', frame(0, 60));
        await jest.advanceTimersByTimeAsync(20);

        expect(pill()).toMatchObject({ left: 2, width: 56 });
      });

      it('with Reduce Motion it simply appears on the new side', async () => {
        jest.mocked(useReducedMotion).mockReturnValue(true);
        const { rerender } = await render(control('6M'));
        await layOut();
        await rerender(control('12M'));
        await jest.advanceTimersByTimeAsync(20);

        expect(pill()).toMatchObject({ left: 46, width: 46 });
      });
    });

    it('keeps its own width in a column, and still fills the height of a row', async () => {
      await render(wrap(<SegmentedControl options={RANGES} value="6M" onChange={jest.fn()} />));

      // A Card or a Stack stretches its children across: the box lets the switch hug its choices
      expect(screen.getByTestId('segmented-box')).toHaveStyle({ minHeight: sizes.touchMin, alignItems: 'flex-start' });
      expect(screen.getByTestId('segmented-control')).toHaveStyle({ flexGrow: 1, flexDirection: 'row' });
    });

    it('on purple: a see-through white track, and a white pill with a bold purple label', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(
          wrap(<SegmentedControl options={RANGES} value="6M" onChange={jest.fn()} tone="onBrand" />, preference),
        );
        await layOutSegments();
        const [other] = screen.getAllByTestId('segment-pill').slice(1);
        const selected = screen.getByTestId('segmented-slider');

        // Round at every text size, like the PickerChip beside it
        expect(screen.getByTestId('segmented-track')).toHaveStyle({
          backgroundColor: colors.controlOnBrand,
          borderRadius: 999,
        });
        expect(selected).toHaveStyle({ backgroundColor: colors.onBrand, borderRadius: 999 });
        expect(other).toHaveStyle({ backgroundColor: 'transparent' });
        expect(screen.getByText('6M')).toHaveStyle({ color: colors.primaryButton, fontWeight: '700' });
        expect(screen.getByText('12M')).toHaveStyle({ color: colors.onBrand });
        expect(style(screen.getByText('12M')).fontWeight).not.toBe('700');

        await unmount();
      }
    });

    it('on the page: a divider track, and a surface pill with a bold label', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(
          wrap(<SegmentedControl options={RANGES} value="12M" onChange={jest.fn()} />, preference),
        );
        await layOutSegments();
        const [other] = screen.getAllByTestId('segment-pill');
        const selected = screen.getByTestId('segmented-slider');

        expect(screen.getByTestId('segmented-track')).toHaveStyle({ backgroundColor: colors.divider });
        expect(selected).toHaveStyle({ backgroundColor: colors.surface });
        expect(other).toHaveStyle({ backgroundColor: 'transparent' });
        expect(screen.getByText('12M')).toHaveStyle({ color: colors.text, fontWeight: '700' });
        expect(screen.getByText('6M')).toHaveStyle({ color: colors.textMuted });

        await unmount();
      }
    });

    it('each segment reaches 44 pt with a real touch box, and dims while pressed', async () => {
      await render(wrap(<SegmentedControl options={RANGES} value="6M" onChange={jest.fn()} tone="onBrand" />));

      const control = screen.getByRole('button');

      for (const segment of screen.getAllByTestId('segment')) {
        expect(segment).toHaveStyle({ minWidth: sizes.touchMin });
        expect(segment.props.hitSlop).toBeUndefined();
      }

      const segment = screen.getAllByTestId('segment')[1] ?? control;
      const pill = within(segment).getByTestId('segment-pill');

      // The pill inside fills what the padding leaves: at least 44 high in all
      expect(pill).toHaveStyle({ flexGrow: 1 });
      expect(2 * Number(style(segment).paddingVertical) + Number(style(pill).minHeight)).toBe(sizes.touchMin);
      // The track is drawn in the middle of the 44 pt box, compactControl high
      expect(screen.getByTestId('segmented-track')).toHaveStyle({ top: slack, bottom: slack });

      // The whole switch is one touch box, and it dims as one
      await fireEvent(control, 'responderGrant', touch);

      expect(control).toHaveStyle({ opacity: 0.8 });
    });

    it('with three choices each segment is its own touch box and dims while pressed', async () => {
      await render(wrap(<SegmentedControl options={THREE} value="6M" onChange={jest.fn()} />));
      const segment = screen.getByRole('tab', { name: '12M' });

      expect(segment).toHaveStyle({ minWidth: sizes.touchMin });

      await fireEvent(segment, 'responderGrant', touch);

      expect(segment).toHaveStyle({ opacity: 0.8 });
    });
  });

  describe('PickerChip', () => {
    it("pickerChipHeight is the chip's own height: its touch box padding, its padding and its line, at the text size", async () => {
      const { fontScale } = Dimensions.get('window');
      await render(wrap(<PickerChip label="Acme · Production" onPress={jest.fn()} />));
      const box = style(screen.getByRole('button', { name: 'Acme · Production' }));
      const chip = style(screen.getByTestId('picker-chip'));
      const line = style(screen.getByText('Acme · Production')).lineHeight ?? 0;
      const drawn = 2 * Number(box.paddingVertical) + 2 * Number(chip.paddingVertical) + line * fontScale;

      // Home's header height (and the splash) count on it
      expect(pickerChipHeight(fontScale)).toBe(Math.max(Number(box.minHeight), drawn));
      expect(pickerChipHeight(1)).toBe(sizes.touchMin);
    });

    it('PickerChip is a button with its label', async () => {
      const onPress = jest.fn();
      await render(wrap(<PickerChip label="Acme · Production" onPress={onPress} />));
      const chip = screen.getByRole('button', { name: 'Acme · Production' });
      await fireEvent.press(chip);

      expect(within(chip).getByText('Acme · Production')).toBeOnTheScreen();
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('is a see-through white chip with white words and a chevron, in light and dark', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(wrap(<PickerChip label="Acme · Production" onPress={jest.fn()} />, preference));

        expect(screen.getByTestId('picker-chip')).toHaveStyle({
          backgroundColor: colors.controlOnBrand,
          borderRadius: 999,
          minHeight: sizes.compactControl,
        });
        expect(screen.getByText('Acme · Production')).toHaveStyle({ color: colors.onBrand });
        expect(JSON.stringify(screen.toJSON())).toContain(`"stroke":"${colors.onBrand}"`);

        await unmount();
      }
    });

    it('reaches 44 pt with a real touch box, the same as the SegmentedControl beside it, and dims while pressed', async () => {
      await render(wrap(<PickerChip label="Acme · Production" onPress={jest.fn()} />));
      const chip = screen.getByRole('button', { name: 'Acme · Production' });

      // Same shape height and same box as the SegmentedControl, so side by side in a row they match
      expect(chip).toHaveStyle({ minHeight: sizes.touchMin, paddingVertical: slack });
      expect(chip.props.hitSlop).toBeUndefined();
      expect(screen.getByTestId('picker-chip')).toHaveStyle({ flexGrow: 1 });

      await fireEvent(chip, 'responderGrant', touch);

      expect(chip).toHaveStyle({ opacity: 0.8 });
    });

    it('the header controls stay readable on every header colour', () => {
      for (const [, colors] of themes) {
        for (const stop of colors.headerGradient) {
          const control = compositeOver(colors.controlOnBrand, stop);

          // The chip's words and the segments that aren't picked
          expect(contrastRatio(colors.onBrand, control)).toBeGreaterThanOrEqual(4.5);
        }

        // The picked segment
        expect(contrastRatio(colors.primaryButton, colors.onBrand)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(colors.textMuted, colors.divider)).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  describe('BreakdownBar', () => {
    it('loading draws placeholders in its own shape: the bar, then four legend lines', async () => {
      const { fontScale } = Dimensions.get('window');
      await render(wrap(<BreakdownBar segments={[]} loading />));
      const [bar, ...legend] = screen.getAllByTestId('skeleton');

      // The bar's height and round ends, then one body line per legend row (3 products and "Other")
      expect(bar).toHaveStyle({ height: 8, borderRadius: 999 });
      expect(legend).toHaveLength(4);
      for (const line of legend) {
        expect(line).toHaveStyle({ height: typography.body.lineHeight * fontScale });
      }
      expect(screen.queryByTestId('breakdown-bar')).not.toBeOnTheScreen();
    });

    it('BreakdownBar gives segments the series colours in order', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(wrap(<BreakdownBar segments={NOVEMBER} />, preference));
        const segments = screen.getAllByTestId('breakdown-segment', { includeHiddenElements: true });
        const dots = screen.getAllByTestId('breakdown-dot', { includeHiddenElements: true });

        expect(segments).toHaveLength(4);
        segments.forEach((segment, index) => {
          expect(segment).toHaveStyle({ backgroundColor: colors.series[index], flexGrow: NOVEMBER[index]?.value });
          expect(dots[index]).toHaveStyle({ backgroundColor: colors.series[index] });
        });

        await unmount();
      }
    });

    it('BreakdownBar caps at 4 segments', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});
      await render(wrap(<BreakdownBar segments={[...NOVEMBER, { label: 'Storage', value: 300, formatted: '€3.00' }]} />));

      expect(screen.getAllByTestId('breakdown-segment', { includeHiddenElements: true })).toHaveLength(4);
      expect(screen.getAllByTestId('breakdown-dot', { includeHiddenElements: true })).toHaveLength(4);
      expect(screen.queryByText('Storage')).not.toBeOnTheScreen();
      expect(error).toHaveBeenCalledWith(expect.stringContaining('at most 4 segments'));
    });

    it('is a bar 8 high with 2 pt gaps, hidden from screen readers; each legend row is read as one phrase', async () => {
      await render(wrap(<BreakdownBar segments={NOVEMBER} />));
      const bar = screen.getByTestId('breakdown-bar', { includeHiddenElements: true });

      expect(bar).toHaveStyle({ height: 8, gap: 2, borderRadius: 999, overflow: 'hidden' });
      expect(bar).not.toBeVisible();
      expect(screen.getByLabelText('Instances, €46.30')).toBeOnTheScreen();
      expect(screen.getByText('€46.30')).toHaveStyle({ color: lightColors.textMuted });
      expect(screen.getByText('Instances')).toHaveStyle({ color: lightColors.text });
    });

    it('shows an empty track when nothing was spent, and leaves zero amounts out of the bar', async () => {
      const { unmount } = await render(wrap(<BreakdownBar segments={[]} />));

      expect(screen.getByTestId('breakdown-empty', { includeHiddenElements: true })).toHaveStyle({
        backgroundColor: lightColors.divider,
      });

      await unmount();
      await render(
        wrap(
          <BreakdownBar
            segments={[
              { label: 'Instances', value: 4630, formatted: '€46.30' },
              { label: 'Other', value: 0, formatted: '€0.00' },
            ]}
          />,
        ),
      );

      expect(screen.getAllByTestId('breakdown-segment', { includeHiddenElements: true })).toHaveLength(1);
      expect(screen.getByLabelText('Other, €0.00')).toBeOnTheScreen();
    });

    it("two segments may share a label (two projects this user can't see): both show", async () => {
      const error = jest.spyOn(console, 'error');
      await render(
        wrap(
          <BreakdownBar
            segments={[
              { label: 'Unknown project', value: 6000, formatted: '€60.00' },
              { label: 'Production', value: 2000, formatted: '€20.00' },
              { label: 'Unknown project', value: 460, formatted: '€4.60' },
            ]}
          />,
        ),
      );

      expect(screen.getAllByTestId('breakdown-segment', { includeHiddenElements: true })).toHaveLength(3);
      expect(screen.getByLabelText('Unknown project, €60.00')).toBeOnTheScreen();
      expect(screen.getByLabelText('Unknown project, €4.60')).toBeOnTheScreen();
      expect(error).not.toHaveBeenCalled();
    });
  });

  describe('AlertRow', () => {
    it('danger: red words and icon on the alert background, read as one phrase', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(
          wrap(<AlertRow title="High CPU on db-main" detail="CPU above 90% for 12 minutes" />, preference),
        );

        expect(screen.getByTestId('alert-row')).toHaveStyle({ backgroundColor: colors.alertBackground });
        expect(screen.getByText('High CPU on db-main')).toHaveStyle({
          color: colors.alertText,
          fontSize: typography.headline.fontSize,
          fontWeight: typography.headline.fontWeight,
        });
        expect(screen.getByText('CPU above 90% for 12 minutes')).toHaveStyle({
          color: colors.alertText,
          fontSize: typography.caption.fontSize,
        });
        expect(JSON.stringify(screen.toJSON())).toContain(`"stroke":"${colors.alertText}"`);
        // Screen readers hear that it's an alert first: the red row says it only to the eye
        expect(screen.getByLabelText('Alert, High CPU on db-main, CPU above 90% for 12 minutes')).toBeOnTheScreen();
        expect(contrastRatio(colors.alertText, colors.alertBackground)).toBeGreaterThanOrEqual(4.5);

        await unmount();
      }
    });

    it('warning: a soft amber background with dark words, calmer than danger', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(
          wrap(<AlertRow title="Disk almost full" detail="fr-par" tone="warning" />, preference),
        );

        expect(screen.getByTestId('alert-row')).toHaveStyle({ backgroundColor: colors.warningBackground });
        expect(screen.getByText('Disk almost full')).toHaveStyle({ color: colors.text });
        expect(screen.getByText('fr-par')).toHaveStyle({ color: colors.textMuted });
        expect(screen.getByLabelText('Warning, Disk almost full, fr-par')).toBeOnTheScreen();
        expect(contrastRatio(colors.text, colors.warningBackground)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(colors.textMuted, colors.warningBackground)).toBeGreaterThanOrEqual(4.5);

        await unmount();
      }
    });
  });

  describe('StatusLine', () => {
    it('a success dot next to its muted words, read as one phrase', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(wrap(<StatusLine label="All Scaleway services running normally" />, preference));

        expect(screen.getByTestId('health-dot', { includeHiddenElements: true })).toHaveStyle({ backgroundColor: colors.success });
        expect(screen.getByText('All Scaleway services running normally')).toHaveStyle({ color: colors.textMuted });
        expect(screen.getByLabelText('All Scaleway services running normally')).toBeOnTheScreen();

        await unmount();
      }
    });
  });

  describe('NoticeCard', () => {
    it('opens on press and reads its title, message and meta', async () => {
      const onPress = jest.fn();
      await render(
        wrap(
          <NoticeCard
            title="Slower block storage in fr-par-1"
            message="We're looking into it."
            meta="Investigating · Block Storage"
            tone="warning"
            onPress={onPress}
          />,
        ),
      );
      const card = screen.getByRole('button', {
        name: "Slower block storage in fr-par-1, We're looking into it., Investigating · Block Storage",
      });
      await fireEvent.press(card);

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('health-dot', { includeHiddenElements: true })).toHaveStyle({ backgroundColor: lightColors.warning });
      expect(screen.getByText("We're looking into it.")).toHaveStyle({ color: lightColors.textMuted });
    });

    it('opens in the browser: the external mark (not a chevron) and the hint "Opens in your browser"', async () => {
      // The lines an icon is drawn with
      const drawing = async (name: 'external' | 'chevron-right') => {
        const { unmount } = await render(wrap(<Icon name={name} size="sm" tone="muted" />));
        const lines = JSON.stringify(screen.toJSON()).match(/"d":"[^"]*"/g) ?? [];
        await unmount();

        return lines;
      };
      const external = await drawing('external');
      const chevron = await drawing('chevron-right');
      await render(wrap(<NoticeCard title="Instances unavailable" meta="Major outage" tone="danger" onPress={jest.fn()} />));
      const tree = JSON.stringify(screen.toJSON());

      expect(external.length).toBeGreaterThan(0);
      expect(external.every((line) => tree.includes(line))).toBe(true);
      expect(chevron.some((line) => tree.includes(line))).toBe(false);
      expect(screen.getByRole('button', { name: 'Instances unavailable, Major outage' }).props.accessibilityHint).toBe(
        'Opens in your browser',
      );
    });

    it('leaves the message out when there is none, and its dot follows the tone', async () => {
      await render(
        wrap(<NoticeCard title="Instances unavailable" meta="Major outage · fr-par-1" tone="danger" onPress={jest.fn()} />, 'dark'),
      );

      expect(screen.getByRole('button', { name: 'Instances unavailable, Major outage · fr-par-1' })).toBeOnTheScreen();
      expect(screen.getByTestId('health-dot', { includeHiddenElements: true })).toHaveStyle({ backgroundColor: darkColors.alertText });
    });
  });

  describe('HealthDot', () => {
    it('HealthDot uses the warning colour for warning', async () => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(wrap(<HealthDot health="warning" />, preference));

        expect(screen.getByTestId('health-dot', { includeHiddenElements: true })).toHaveStyle({
          backgroundColor: colors.warning,
          width: sizes.dot,
          height: sizes.dot,
        });

        await unmount();
      }
    });

    it.each(Object.keys(HEALTH_COLOURS) as Health[])('%s has its own colour', async (health) => {
      await render(wrap(<HealthDot health={health} />));

      expect(screen.getByTestId('health-dot', { includeHiddenElements: true })).toHaveStyle({
        backgroundColor: HEALTH_COLOURS[health](lightColors),
      });
    });

    it('is hidden from screen readers and sits in the middle of the first text line next to it', async () => {
      const { fontScale } = Dimensions.get('window');
      await render(wrap(<HealthDot health="ok" line="headline" />));

      expect(screen.getByTestId('health-dot', { includeHiddenElements: true })).not.toBeVisible();
      expect(screen.getByTestId('health-dot-line', { includeHiddenElements: true })).toHaveStyle({
        height: typography.headline.lineHeight * fontScale,
        justifyContent: 'center',
      });
    });
  });

  describe('ResourceCard', () => {
    it('ResourceCard has no switch and opens on press', async () => {
      const onPress = jest.fn();
      await render(wrap(resourceCard({ onPress })));

      expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
      expect(screen.getAllByRole('button')).toHaveLength(1);

      await fireEvent.press(screen.getByRole('button'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it.each(Object.keys(HEALTH_PILLS) as Health[])(
      '%s: the dot and a readable status Pill in the health colour',
      async (health) => {
        for (const [preference, colors] of themes) {
          const { unmount } = await render(wrap(resourceCard({ health, statusLabel: 'Some status' }), preference));
          const { background, text } = HEALTH_PILLS[health](colors);

          expect(screen.getByTestId('health-dot', { includeHiddenElements: true })).toHaveStyle({
            backgroundColor: HEALTH_COLOURS[health](colors),
          });
          expect(screen.getByTestId('pill')).toHaveStyle({ backgroundColor: background });
          expect(screen.getByText('Some status')).toHaveStyle({ color: text });
          expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(4.5);

          await unmount();
        }
      },
    );

    it('shows its facts on one line each, then Status, and screen readers hear them as one phrase', async () => {
      await render(wrap(resourceCard()));

      for (const line of ['web-prod-1', 'Instance · Ubuntu', 'fr-par-1 · 51.15.12.34']) {
        expect(screen.getByText(line).props.numberOfLines).toBe(1);
      }

      expect(screen.getByText('Status')).toHaveStyle({ color: lightColors.textMuted });
      expect(
        screen.getByRole('button', { name: 'web-prod-1, Instance · Ubuntu, fr-par-1 · 51.15.12.34, Running' }),
      ).toBeOnTheScreen();
    });

    it.each(PRODUCTS)('%s: its own tile and icon colour, from the product', async (product) => {
      for (const [preference, colors] of themes) {
        const { unmount } = await render(wrap(resourceCard({ product }), preference));
        const { tile, icon } = colors.products[product];

        expect(screen.getByTestId('product-tile')).toHaveStyle({ backgroundColor: tile });
        expect(strokes(icon)).toBe(1);
        // An icon needs 3:1 on its tile
        expect(contrastRatio(icon, tile)).toBeGreaterThanOrEqual(3);

        await unmount();
      }
    });

    it('every product has its own colour, in light and dark', () => {
      for (const [, colors] of themes) {
        expect(Object.keys(colors.products).sort()).toEqual([...PRODUCTS].sort());
        expect(new Set(PRODUCTS.map((product) => colors.products[product].icon)).size).toBe(PRODUCTS.length);
        expect(new Set(PRODUCTS.map((product) => colors.products[product].tile)).size).toBe(PRODUCTS.length);
      }
    });

    it('a product ui does not know yet gets a neutral tile instead of a crash', async () => {
      for (const [preference, colors] of themes) {
        // core added a product before ui got its colour
        const { unmount } = await render(wrap(resourceCard({ product: 'object-storage' as Product }), preference));

        expect(screen.getByTestId('product-tile')).toHaveStyle({ backgroundColor: colors.background });
        expect(strokes(colors.textMuted)).toBe(1);
        expect(contrastRatio(colors.textMuted, colors.background)).toBeGreaterThanOrEqual(3);
        expect(screen.getByRole('button', { name: /^web-prod-1, / })).toBeOnTheScreen();

        await unmount();
      }
    });

    it('fills the height of its Carousel slot, with Status at the bottom', async () => {
      await render(wrap(resourceCard()));

      // Cards in a row are as tall as the tallest; the free room goes above the divider, so every Status lines up
      expect(screen.getByRole('button')).toHaveStyle({ flexGrow: 1 });
      expect(screen.getByTestId('resource-card-body')).toHaveStyle({ flexGrow: 1 });
      expect(screen.getByTestId('resource-card-room')).toHaveStyle({ flexGrow: 1 });
    });

    it('pinned: a filled star in the brand colour, and it says so', async () => {
      const brandStrokes = () => strokes(darkColors.brand);
      const { rerender } = await render(wrap(resourceCard(), 'dark'));
      const withoutStar = brandStrokes();

      expect(screen.queryByTestId('resource-pinned', { includeHiddenElements: true })).not.toBeOnTheScreen();
      expect(fills(darkColors.brand)).toBe(0);

      await rerender(wrap(resourceCard({ pinned: true }), 'dark'));

      // One more brand icon: the star, filled
      expect(screen.getByTestId('resource-pinned', { includeHiddenElements: true })).toBeOnTheScreen();
      expect(brandStrokes()).toBe(withoutStar + 1);
      expect(fills(darkColors.brand)).toBe(1);
      expect(
        screen.getByRole('button', { name: 'web-prod-1, Instance · Ubuntu, fr-par-1 · 51.15.12.34, Running, Pinned' }),
      ).toBeOnTheScreen();
    });

    it("loading draws the card's own shape: the tile, three lines, the divider, Status and a pill", async () => {
      const { fontScale } = Dimensions.get('window');
      await render(wrap(<ResourceCard loading />));
      const skeletons = screen.getAllByTestId('skeleton', { includeHiddenElements: true });

      // Nothing to press or to read out yet
      expect(screen.queryByRole('button')).not.toBeOnTheScreen();
      expect(screen.getByTestId('resource-card-placeholder', { includeHiddenElements: true })).not.toBeVisible();
      expect(skeletons.map((skeleton) => style(skeleton).height)).toEqual([
        30,
        typography.headline.lineHeight * fontScale,
        typography.subhead.lineHeight * fontScale,
        typography.subhead.lineHeight * fontScale,
        typography.caption.lineHeight * fontScale + 2 * spacing.xxs,
      ]);
      expect(style(skeletons[4] ?? { props: {} }).borderRadius).toBe(999);
      expect(screen.getByText('Status', { includeHiddenElements: true })).toHaveStyle({ color: lightColors.textMuted });
      // As tall as the real cards of its row, with Status at the bottom
      expect(screen.getByTestId('resource-card-placeholder', { includeHiddenElements: true })).toHaveStyle({ flexGrow: 1 });
    });

    it('dims while pressed, like every card', async () => {
      await render(wrap(resourceCard()));
      const card = screen.getByRole('button');
      await fireEvent(card, 'responderGrant', touch);

      expect(card).toHaveStyle({ opacity: 0.8 });
    });
  });

  describe('Carousel', () => {
    const cards = (
      <Carousel itemWidth={sizes.resourceCard}>
        <Card>
          <Text variant="body">One</Text>
        </Card>

        <Card>
          <Text variant="body">Two</Text>
        </Card>
      </Carousel>
    );

    it('snaps to its items and bleeds to the screen edge on a phone', async () => {
      withWindow(390, 1);
      await render(wrap(cards));
      const carousel = screen.getByTestId('carousel');

      expect(carousel.props.horizontal).toBe(true);
      expect(carousel.props.snapToInterval).toBe(sizes.resourceCard + spacing.sm);
      expect(carousel.props.decelerationRate).toBe('fast');
      // The margin sits on the wrapper that turns iOS's edge effects off, so swipes reach the edges too
      expect(carousel.parent).toHaveStyle({ marginHorizontal: -spacing.md });
      expect(carousel.parent?.props).toMatchObject({ topScrollEdgeEffect: 'hidden', leftScrollEdgeEffect: 'hidden' });
      expect(style({ props: { style: carousel.props.contentContainerStyle } })).toMatchObject({
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
        // Every slot is as tall as the tallest card
        alignItems: 'stretch',
      });

      for (const item of screen.getAllByTestId('carousel-item')) {
        expect(item).toHaveStyle({ width: sizes.resourceCard });
      }
    });

    it('on Android, sits in a plain view with the same bleed (its edge marker would crash on a carousel)', async () => {
      Platform.OS = 'android';
      withWindow(390, 1);

      try {
        await render(wrap(cards));
        const carousel = screen.getByTestId('carousel');

        expect(carousel.parent).toHaveStyle({ marginHorizontal: -spacing.md });
        expect(carousel.parent?.type).toBe('View');
        expect(carousel.parent?.props.topScrollEdgeEffect).toBeUndefined();
      } finally {
        Platform.OS = 'ios';
      }
    });

    it('items grow with the text size, up to the width of the content', async () => {
      withWindow(390, 1.5);
      const { unmount } = await render(wrap(cards));

      expect(screen.getAllByTestId('carousel-item')[0]).toHaveStyle({ width: sizes.resourceCard * 1.5 });
      expect(screen.getByTestId('carousel').props.snapToInterval).toBe(sizes.resourceCard * 1.5 + spacing.sm);

      await unmount();
      withWindow(390, 3);
      await render(wrap(cards));

      // 390 minus 16 on each side: one card fills the column, the next one starts past the edge
      expect(screen.getAllByTestId('carousel-item')[0]).toHaveStyle({ width: 390 - 2 * spacing.md });
    });

    it('cards share the height of the tallest: a plain Card fills its slot with grow', async () => {
      await render(
        wrap(
          <Carousel itemWidth={sizes.resourceCard}>
            <Card grow>
              <Text variant="body">One</Text>
            </Card>

            <Card grow>
              <Text variant="body">A card with much more to say than the other one</Text>
            </Card>
          </Carousel>,
        ),
      );

      for (const item of screen.getAllByTestId('carousel-item')) {
        // No height of its own: the row stretches it; the card inside fills it
        expect(style(item).height).toBeUndefined();
        expect(style(item).alignSelf).toBeUndefined();
        expect(item.children[0]).toHaveStyle({ flexGrow: 1 });
      }
    });

    it('moves a card when the order changes, instead of building it again', async () => {
      const mounts = jest.fn();
      function Probe({ name }: { name: string }) {
        useEffect(() => {
          mounts(name);
        }, [name]);

        return <Text variant="body">{name}</Text>;
      }
      const carousel = (names: string[]) =>
        wrap(
          <Carousel itemWidth={sizes.resourceCard}>
            {names.map((name) => (
              <Probe key={name} name={name} />
            ))}
          </Carousel>,
        );
      const { rerender } = await render(carousel(['web-prod-1', 'db-main']));

      expect(mounts).toHaveBeenCalledTimes(2);

      // db-main now has a problem, so it comes first
      await rerender(carousel(['db-main', 'web-prod-1']));

      expect(mounts).toHaveBeenCalledTimes(2);
    });

    it('on an iPad it still bleeds to the screen edge, past the centred column', async () => {
      withWindow(1024, 1);
      await render(
        wrap(
          <Carousel itemWidth={sizes.resourceCard} gap="md">
            <Card>
              <Text variant="body">One</Text>
            </Card>
          </Carousel>,
        ),
      );
      const bleed = (1024 - sizes.contentMaxWidth) / 2 + spacing.md;

      expect(screen.getByTestId('carousel').parent).toHaveStyle({ marginHorizontal: -bleed });
      expect(screen.getByTestId('carousel').props.snapToInterval).toBe(sizes.resourceCard + spacing.md);
    });
  });

  describe('SectionHeader', () => {
    it('SectionHeader action is pressable', async () => {
      const onPress = jest.fn();
      await render(wrap(<SectionHeader title="Live resources" action={{ label: 'See all', onPress }} />));
      await fireEvent.press(screen.getByRole('button', { name: 'See all' }));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('its title is a header, its action a small ghost button with the chevron after the words', async () => {
      await render(wrap(<SectionHeader title="Live resources" action={{ label: 'See all', onPress: jest.fn() }} />));
      const action = screen.getByRole('button', { name: 'See all' });
      const json = JSON.stringify(screen.toJSON());

      expect(screen.getByRole('header', { name: 'Live resources' })).toHaveStyle({
        fontSize: typography.headline.fontSize,
      });
      expect(within(action).getByTestId('button-pill')).toHaveStyle({ minHeight: sizes.buttonSm });
      expect(screen.getByText('See all')).toHaveStyle({ color: lightColors.brand });
      // The chevron comes after the words
      expect(json.indexOf('"children":["See all"]')).toBeGreaterThan(-1);
      expect(json.indexOf('"children":["See all"]')).toBeLessThan(json.indexOf(`"stroke":"${lightColors.brand}"`));
      // A row that mixes a button with text centres them, so the button keeps its own height
      expect(screen.getByTestId('section-header')).toHaveStyle({ alignItems: 'center' });
    });

    it('"See all ›" lines up with the cards: the button\'s padding goes into the screen margin', async () => {
      await render(wrap(<SectionHeader title="Live resources" action={{ label: 'See all', onPress: jest.fn() }} />));
      const pill = within(screen.getByRole('button', { name: 'See all' })).getByTestId('button-pill');

      // The words end exactly at the content edge, the touch box stays 44 high
      expect(screen.getByTestId('section-header')).toHaveStyle({ marginRight: -spacing.md });
      expect(pill).toHaveStyle({ paddingHorizontal: spacing.md });
      expect(screen.getByRole('button', { name: 'See all' })).toHaveStyle({ minHeight: sizes.touchMin });
    });

    it('without an action there is nothing to press, and nothing reaches into the margin', async () => {
      await render(wrap(<SectionHeader title="Invoices" />));

      expect(screen.getByRole('header', { name: 'Invoices' })).toBeOnTheScreen();
      expect(screen.queryByRole('button')).not.toBeOnTheScreen();
      expect(style(screen.getByTestId('section-header')).marginRight ?? 0).toBe(0);
    });

    it('an action that stays on the screen ("Back to now") has no chevron, and the row keeps its height without it', async () => {
      const onPress = jest.fn();
      const { rerender } = await render(
        wrap(<SectionHeader title="September by product" action={{ label: 'Back to now', onPress, chevron: false }} />),
      );
      const action = screen.getByRole('button', { name: 'Back to now' });

      // Only the words (no brand icon drawn): a chevron says it opens something
      expect(JSON.stringify(screen.toJSON())).not.toContain(`"stroke":"${lightColors.brand}"`);
      expect(screen.getByTestId('section-header')).toHaveStyle({ minHeight: sizes.touchMin, marginRight: -spacing.md });

      await fireEvent.press(action);

      expect(onPress).toHaveBeenCalledTimes(1);

      // Back on this month: same height, so the card doesn't jump
      await rerender(wrap(<SectionHeader title="November by product" />));

      expect(screen.getByTestId('section-header')).toHaveStyle({ minHeight: sizes.touchMin });
    });
  });
});
