import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { Dimensions, processColor, StyleSheet } from 'react-native';
import { getAnimatedStyle as getStyle, useReducedMotion } from 'react-native-reanimated';
import type { getAnimatedStyle as NativeGetAnimatedStyle } from 'react-native-reanimated/lib/typescript/jestUtils/index.native';

import { ThemeProvider } from '../theme';
import { contrastRatio, darkColors, lightColors, motion, sizes, spacing } from '../tokens';
import { monotoneLengths } from './geometry';
import { LineChart, lineChartHeight } from './LineChart';
import type { ChartPoint } from './LineChart';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

// TypeScript sees Reanimated's web stub of getAnimatedStyle; Jest runs the native one
const getAnimatedStyle = getStyle as unknown as typeof NativeGetAnimatedStyle;

const { duration } = motion;

const SIX_MONTHS: ChartPoint[] = [
  { key: '2026-06', label: 'Jun', value: 10240, description: 'June 2026, €102.40' },
  { key: '2026-07', label: 'Jul', value: 11020, description: 'July 2026, €110.20' },
  { key: '2026-08', label: 'Aug', value: 9980, description: 'August 2026, €99.80' },
  { key: '2026-09', label: 'Sep', value: 11860, description: 'September 2026, €118.60' },
  { key: '2026-10', label: 'Oct', value: 14120, description: 'October 2026, €141.20' },
  { key: '2026-11', label: 'Nov', value: 8460, description: 'November 2026, €84.60' },
];

const PROJECTION = { value: 14929, label: '≈ €149.29 by month end' };

type LineChartProps = ComponentProps<typeof LineChart>;

function lineChart(overrides: Partial<LineChartProps> = {}, preference: 'light' | 'dark' = 'light') {
  return (
    <ThemeProvider preference={preference}>
      <LineChart
        points={SIX_MONTHS}
        unfinishedLast
        projection={PROJECTION}
        selectedIndex={null}
        onSelect={jest.fn()}
        size="header"
        {...overrides}
      />
    </ThemeProvider>
  );
}

// The chart draws once it knows how wide it is
async function renderChart(
  overrides: Partial<LineChartProps> = {},
  preference: 'light' | 'dark' = 'light',
  width = 350,
) {
  const result = await render(lineChart(overrides, preference));

  await fireEvent(screen.getByTestId('line-chart'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 150 } },
  });

  return result;
}

const dot = (index: number) =>
  screen.getByTestId(`chart-dot-${index}`).props as {
    cx: number;
    cy: number;
    r: number;
    stroke: unknown;
    strokeWidth: number;
  };

const pathOf = (testID: string) => String(screen.getByTestId(testID).props.d);

// A path starts on one dot and ends on another
function expectPieceBetween(testID: string, from: { cx: number; cy: number }, to: { cx: number; cy: number }) {
  const d = pathOf(testID);

  expect(d.startsWith(`M${from.cx},${from.cy}`)).toBe(true);
  expect(d.endsWith(`${to.cx},${to.cy}`)).toBe(true);
}

// The line's parts drawn through a clip
const clipped = () =>
  ['chart-line', 'chart-fill', 'chart-fill-unfinished', 'chart-dotted'].filter(
    (testID) => screen.queryByTestId(testID)?.props.clipPath !== undefined,
  );

// A finger on the chart at (x, y): the chart sits at the top left, so page and chart points are the same
async function finger(event: 'responderGrant' | 'responderMove' | 'responderRelease', x: number, y: number) {
  await fireEvent(screen.getByTestId('chart-touch'), event, { nativeEvent: { locationX: x, pageX: x, pageY: y } });
}

const labelBox = (index: number) =>
  StyleSheet.flatten(screen.getByTestId(`chart-label-${index}`).props.style) as { left: number; width: number };

describe('LineChart', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.mocked(useReducedMotion).mockReturnValue(false);
    jest.useRealTimers();
  });

  it('LineChart draws a flat line when every value is zero', async () => {
    const zeros = SIX_MONTHS.map((point) => ({ ...point, value: 0 }));
    const { unmount } = await renderChart({ points: zeros, unfinishedLast: false, projection: null });
    const heights = zeros.map((_, index) => dot(index).cy);

    expect(screen.getByTestId('chart-line').props.d).not.toMatch(/NaN|Infinity/);
    expect(screen.getByTestId('chart-fill').props.d).not.toMatch(/NaN|Infinity/);
    expect(new Set(heights).size).toBe(1);

    await unmount();
    await renderChart({ unfinishedLast: false, projection: null });

    // At the bottom, where the lowest month of a normal chart sits
    expect(heights[0]).toBe(dot(5).cy);
  });

  it('tapping near a point selects it', async () => {
    // A small phone, a phone and an iPad
    for (const width of [240, 350, 744]) {
      const onSelect = jest.fn();
      const { unmount } = await renderChart({ onSelect }, 'light', width);

      expect(screen.getByTestId('chart-touch').props.onStartShouldSetResponder()).toBe(true);

      await finger('responderGrant', dot(3).cx + 6, 50);

      // Nothing yet: it could still become a scroll
      expect(onSelect).not.toHaveBeenCalled();

      await finger('responderRelease', dot(3).cx + 6, 50);

      expect(onSelect.mock.calls).toEqual([[3]]);

      await unmount();
    }
  });

  it('dragging along the chart snaps to the nearest point', async () => {
    const onSelect = jest.fn();
    await renderChart({ onSelect });

    await finger('responderGrant', dot(0).cx, 50);
    await finger('responderMove', dot(4).cx - 10, 52);
    // Still nearest to October: not sent again
    await finger('responderMove', dot(4).cx + 5, 53);

    // While it drags along the months, the chart keeps the finger
    expect(screen.getByTestId('chart-touch').props.onResponderTerminationRequest()).toBe(false);

    // Past the right end: the last point
    await finger('responderMove', 400, 53);
    await finger('responderRelease', 400, 53);

    expect(onSelect.mock.calls).toEqual([[4], [5]]);
  });

  it('the pulse starts when the months arrive, not while loading', async () => {
    const { rerender } = await render(lineChart({ loading: true }));

    await fireEvent(screen.getByTestId('line-chart'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 350, height: 150 } },
    });
    // Long enough to be halfway through a pulse, had it started at mount
    await jest.advanceTimersByTimeAsync(duration.chartDotsDelay + duration.chartPulse / 4);
    await rerender(lineChart({ loading: false }));
    await jest.advanceTimersByTimeAsync(50);

    // At rest when the months arrive: it waits for the dots
    expect(screen.getByTestId('chart-pulse')).toHaveAnimatedStyle({ opacity: 0.6, transform: [{ scale: 1 }] });

    await jest.advanceTimersByTimeAsync(duration.chartDotsDelay + duration.chartPulse / 2 - 50);
    const { transform } = getAnimatedStyle(screen.getByTestId('chart-pulse')) as { transform: { scale: number }[] };

    expect(transform[0]?.scale).toBeGreaterThan(2);
  });

  it('a tap that jitters a little still selects', async () => {
    const onSelect = jest.fn();
    await renderChart({ onSelect });

    // Within the 8 pt slop: still a tap
    await finger('responderGrant', dot(2).cx, 50);
    await finger('responderMove', dot(2).cx + 3, 52);

    // Nothing picked yet, and the scroll view may still take the finger
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId('chart-touch').props.onResponderTerminationRequest()).toBe(true);

    await finger('responderRelease', dot(2).cx + 3, 52);

    expect(onSelect.mock.calls).toEqual([[2]]);
  });

  it('a diagonal drag counts as a scroll, so it picks nothing', async () => {
    const onSelect = jest.fn();
    await renderChart({ onSelect });

    // As far sideways as up or down: the scroll view gets it
    await finger('responderGrant', dot(2).cx, 50);
    await finger('responderMove', dot(2).cx + 20, 70);

    expect(screen.getByTestId('chart-touch').props.onResponderTerminationRequest()).toBe(true);

    await finger('responderMove', dot(4).cx, 72);
    await finger('responderRelease', dot(4).cx, 72);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('scrolling over the chart picks no month', async () => {
    const onSelect = jest.fn();
    await renderChart({ onSelect });
    const touch = screen.getByTestId('chart-touch');

    await finger('responderGrant', dot(2).cx, 50);
    await finger('responderMove', dot(2).cx + 3, 90);

    // The scroll view may take the finger
    expect(touch.props.onResponderTerminationRequest()).toBe(true);

    await fireEvent(touch, 'responderTerminate', { nativeEvent: { locationX: dot(2).cx + 3, pageX: dot(2).cx + 3, pageY: 90 } });

    // An up-or-down move that ends on the chart is no tap either
    await finger('responderGrant', dot(2).cx, 50);
    await finger('responderMove', dot(2).cx, 20);
    await finger('responderMove', dot(4).cx, 25);
    await finger('responderRelease', dot(4).cx, 25);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('a chart with one month draws without NaN', async () => {
    await renderChart({ points: SIX_MONTHS.slice(-1), unfinishedLast: true, projection: PROJECTION });

    expect(screen.getByTestId('chart-line').props.d).not.toMatch(/NaN|Infinity/);
    expect(screen.getByTestId('chart-fill').props.d).not.toMatch(/NaN|Infinity/);
    expect(dot(0).cx).toBe(175);
    expect(screen.queryByTestId('chart-dotted')).toBeNull();
  });

  it('the lowest month leaves room for the fill under it', async () => {
    // November is the lowest month
    await renderChart({ selectedIndex: 5 });
    const guide = screen.getByTestId('chart-guide').props;

    expect(guide.y2 - dot(5).cy).toBe(spacing.xxl);
  });

  it('the fill is a little stronger in dark mode, as in the mockup', async () => {
    for (const [preference, expected] of [
      ['light', [0.38, 0.16]],
      ['dark', [0.45, 0.18]],
    ] as const) {
      const { toJSON, unmount } = await renderChart({}, preference);
      // The top colour of each fill gradient (its alpha is the stop's opacity)
      const tops: number[] = [];
      const nodes: unknown[] = [toJSON()].flat();

      while (nodes.length > 0) {
        const node = nodes.pop() as { type: string; props: { gradient?: number[] }; children: unknown[] | null } | null;

        if (node !== null && typeof node === 'object') {
          if (node.type === 'RNSVGLinearGradient') {
            tops.push((node.props.gradient?.[1] ?? 0) >>> 24);
          }

          nodes.push(...(node.children ?? []));
        }
      }

      expect(tops.sort((a, b) => b - a).map((alpha) => alpha / 255)).toEqual(
        expected.map((opacity) => expect.closeTo(opacity, 2)),
      );

      await unmount();
    }
  });

  it('the end labels stay clear of the screen edge, and labels never touch', async () => {
    await renderChart();

    // The header's padding is 20: the end labels may use up to 16 of it
    expect(labelBox(0).left).toBeGreaterThanOrEqual(-spacing.md);
    expect(labelBox(5).left + labelBox(5).width).toBeLessThanOrEqual(350 + spacing.md);

    for (let index = 1; index < SIX_MONTHS.length; index += 1) {
      const before = labelBox(index - 1);

      expect(labelBox(index).left - (before.left + before.width)).toBeGreaterThanOrEqual(spacing.xxs - 1e-9);
    }
  });

  it('loading draws placeholders at the chart\'s exact height', async () => {
    const { rerender } = await renderChart();
    const height = StyleSheet.flatten(screen.getByTestId('line-chart').props.style).height;

    await rerender(lineChart({ loading: true }));

    expect(StyleSheet.flatten(screen.getByTestId('line-chart').props.style).height).toBe(height);
    expect(screen.queryByTestId('chart-dot-0')).toBeNull();

    // The line's area, and a line where the month labels go, in the soft white made for purple
    for (const placeholder of screen.getAllByTestId('skeleton')) {
      expect(placeholder).toHaveStyle({ backgroundColor: lightColors.skeletonOnBrand });
    }

    expect(screen.getAllByTestId('skeleton')).toHaveLength(2);
    // Nothing to adjust yet: screen readers hear a busy progress bar
    expect(screen.queryByRole('adjustable')).toBeNull();
    expect(screen.getByRole('progressbar', { name: 'Spending chart' }).props.accessibilityState).toMatchObject({
      busy: true,
    });
  });

  it('loading, then the months arrive: the chart draws itself in', async () => {
    const { rerender } = await render(lineChart({ loading: true }));

    // Measured while loading: the same box stays when the months arrive
    await fireEvent(screen.getByTestId('line-chart'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 350, height: 150 } },
    });
    await jest.advanceTimersByTimeAsync(duration.chartDotsDelay + duration.chartFillRise);
    await rerender(lineChart({ loading: false }));

    expect(dot(0)).toBeDefined();
    // The drawing-in starts now, not while it was loading
    expect(screen.getByTestId('chart-fill-layer')).toHaveAnimatedStyle({ opacity: 0 });

    await jest.advanceTimersByTimeAsync(duration.chartDotsDelay + duration.chartFillRise);

    expect(screen.getByTestId('chart-fill-layer')).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.getByTestId('chart-dots-layer')).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('only the last segment is dotted when unfinishedLast', async () => {
    const { rerender } = await renderChart();
    const dotted = screen.getAllByTestId('chart-dotted');
    const october = dot(4).cx;

    expect(dotted).toHaveLength(1);
    expect(dotted[0]?.props).toMatchObject({ strokeDasharray: [1, 5], strokeOpacity: 0.8 });
    expect(screen.getByTestId('chart-fill-unfinished')).toBeOnTheScreen();

    // The solid line and its fill stop at October; the dotted line and the lighter fill go from there to November
    expectPieceBetween('chart-line', dot(0), dot(4));
    expectPieceBetween('chart-dotted', dot(4), dot(5));
    // The solid fill closes down from October and back to June along the bottom
    expect(pathOf('chart-fill')).toMatch(new RegExp(`L${october},[\\d.]+L${dot(0).cx},[\\d.]+Z$`));
    expect(pathOf('chart-fill-unfinished').startsWith(`M${october},${dot(4).cy}`)).toBe(true);
    // Separate shapes, no clips: a clip that moves (6M ↔ 12M) can be left behind by the native drawing
    expect(clipped()).toEqual([]);

    await rerender(lineChart({ unfinishedLast: false }));

    expect(screen.queryByTestId('chart-dotted')).toBeNull();
    expect(screen.queryByTestId('chart-fill-unfinished')).toBeNull();
    expectPieceBetween('chart-line', dot(0), dot(5));
  });

  it('the line draws itself in up to October, not past it', async () => {
    await renderChart();
    const lengths = monotoneLengths([0, 1, 2, 3, 4, 5].map((index) => ({ x: dot(index).cx, y: dot(index).cy })));
    const [dash, gap] = screen.getByTestId('chart-line').props.strokeDasharray as number[];

    expect(dash).toBeCloseTo(lengths.slice(0, -1).reduce((sum, length) => sum + length, 0));
    expect(gap).toBeCloseTo(lengths.reduce((sum, length) => sum + length, 0));
  });

  it('both fills fade from the highest month, even when it is not October', async () => {
    const julyPeak = SIX_MONTHS.map((point) => (point.key === '2026-07' ? { ...point, value: 20000 } : point));

    const { toJSON } = await renderChart({ points: julyPeak });
    const gradients: Record<string, unknown>[] = [];
    const nodes: unknown[] = [toJSON()].flat();

    while (nodes.length > 0) {
      const node = nodes.pop() as { type: string; props: Record<string, unknown>; children: unknown[] | null } | null;

      if (node !== null && typeof node === 'object') {
        if (node.type === 'RNSVGLinearGradient') {
          gradients.push(node.props);
        }

        nodes.push(...(node.children ?? []));
      }
    }

    // Measured on the whole drawing (1: userSpaceOnUse), from July's height down to the bottom, for both fills
    expect(gradients).toHaveLength(2);

    for (const gradient of gradients) {
      expect(gradient).toMatchObject({ gradientUnits: 1, y1: dot(1).cy, y2: gradients[0]?.y2 });
    }
  });

  it('two months, the last unfinished: no solid line, a straight dotted one', async () => {
    await renderChart({ points: SIX_MONTHS.slice(4) });

    expect(pathOf('chart-line')).toBe(`M${dot(0).cx},${dot(0).cy}`);
    expect(pathOf('chart-dotted')).toBe(`M${dot(0).cx},${dot(0).cy}L${dot(1).cx},${dot(1).cy}`);
    expect(screen.getByTestId('chart-fill-unfinished')).toBeOnTheScreen();
  });

  it('switching 6M to 12M and back moves the dotted piece with the months', async () => {
    const twelve: ChartPoint[] = [
      ...SIX_MONTHS.map((point, index) => ({ ...point, key: `2025-${index + 1}`, label: 'x' })),
      ...SIX_MONTHS,
    ];
    const { rerender } = await renderChart();

    await rerender(lineChart({ points: twelve }));

    expectPieceBetween('chart-dotted', dot(10), dot(11));
    expectPieceBetween('chart-line', dot(0), dot(10));

    await rerender(lineChart({ points: SIX_MONTHS }));

    expectPieceBetween('chart-dotted', dot(4), dot(5));
    expectPieceBetween('chart-line', dot(0), dot(4));
    expect(clipped()).toEqual([]);
  });

  it('no projection is drawn when projection is null', async () => {
    const { rerender } = await renderChart();

    expect(screen.getByText('≈ €149.29 by month end')).toBeOnTheScreen();
    expect(screen.getByTestId('chart-projection-line')).toBeOnTheScreen();
    // A hollow dot, above November
    expect(screen.getByTestId('chart-projection-dot').props).toMatchObject({ cx: dot(5).cx, fill: null });
    expect(screen.getByTestId('chart-projection-dot').props.cy).toBeLessThan(dot(4).cy);

    await rerender(lineChart({ projection: null }));

    expect(screen.queryByText(/by month end/)).toBeNull();
    expect(screen.queryByTestId('chart-projection-line')).toBeNull();
    expect(screen.queryByTestId('chart-projection-dot')).toBeNull();
  });

  it('selecting a past month does not change the points\' y positions', async () => {
    const { rerender } = await renderChart();
    const heights = SIX_MONTHS.map((_, index) => dot(index).cy);

    // The screen keeps passing the projection, and only hides it
    await rerender(lineChart({ selectedIndex: 3, projectionVisible: false }));

    expect(SIX_MONTHS.map((_, index) => dot(index).cy)).toEqual(heights);
    expect(screen.queryByText(/by month end/)).toBeNull();
    expect(screen.queryByTestId('chart-projection-line')).toBeNull();
    expect(screen.queryByTestId('chart-projection-dot')).toBeNull();
    expect(screen.getByRole('adjustable').props.accessibilityValue).toEqual({ text: 'September 2026, €118.60' });
  });

  it('the dots wear the theme\'s ring colour, a deep purple in dark mode', async () => {
    for (const [preference, colors] of [
      ['light', lightColors],
      ['dark', darkColors],
    ] as const) {
      const { unmount } = await renderChart({ selectedIndex: 2 }, preference);
      const ring = { type: 0, payload: processColor(colors.chartDotRing) };

      expect(dot(0).stroke).toEqual(ring);
      expect(screen.getByTestId('chart-selected-dot').props.stroke).toEqual(ring);
      // It sets the white dot apart from the white line
      expect(contrastRatio(colors.chartDotRing, colors.onBrand)).toBeGreaterThanOrEqual(3);

      await unmount();
    }

    // As in the approved mockup, not the light lavender `brand` of dark mode
    expect(darkColors.chartDotRing).not.toBe(darkColors.brand);
  });

  it('on mount the line draws itself, then the fill rises and the dots appear', async () => {
    await renderChart();
    const fill = screen.getByTestId('chart-fill-layer');
    const dots = screen.getByTestId('chart-dots-layer');

    // Not drawn yet: the dash is pushed past the line
    expect(screen.getByTestId('chart-line').props.strokeDashoffset).toBeGreaterThan(0);
    expect(fill).toHaveAnimatedStyle({ opacity: 0, transform: [{ translateY: motion.distance.chartRise }] });
    expect(dots).toHaveAnimatedStyle({ opacity: 0 });

    await jest.advanceTimersByTimeAsync(duration.chartFillDelay - 50);

    expect(fill).toHaveAnimatedStyle({ opacity: 0 });

    await jest.advanceTimersByTimeAsync(duration.chartDotsDelay - duration.chartFillDelay);

    expect(getAnimatedStyle(fill).opacity).toBeGreaterThan(0);
    expect(dots).toHaveAnimatedStyle({ opacity: 0 });

    await jest.advanceTimersByTimeAsync(duration.chartFillRise + duration.slow);

    expect(fill).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    expect(dots).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('the current month pulses while it is unfinished', async () => {
    const { rerender } = await renderChart();
    const november = dot(5);
    const pulse = screen.getByTestId('chart-pulse');

    // The running month's dot is a little bigger, with a thicker ring, and the pulse grows from it
    expect(november).toMatchObject({ r: 4, strokeWidth: 2 });
    expect(dot(4)).toMatchObject({ r: 3, strokeWidth: 1.6 });
    expect(pulse).toHaveStyle({
      left: november.cx - november.r,
      top: november.cy - november.r,
      width: 2 * november.r,
      height: 2 * november.r,
    });

    // Halfway through a pulse: grown and faded out
    await jest.advanceTimersByTimeAsync(duration.chartDotsDelay + duration.chartPulse / 2);
    const { opacity, transform } = getAnimatedStyle(pulse) as { opacity: number; transform: { scale: number }[] };

    expect(opacity).toBeLessThan(0.1);
    expect(transform[0]?.scale).toBeGreaterThan(2);

    await rerender(lineChart({ unfinishedLast: false }));

    expect(screen.queryByTestId('chart-pulse')).toBeNull();
    expect(dot(5)).toMatchObject({ r: 3, strokeWidth: 1.6 });
  });

  it('Reduce Motion draws everything at once', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    await renderChart();
    await jest.advanceTimersByTimeAsync(20);

    // Fully drawn (an offset of 0 reaches the native line as null)
    expect(screen.getByTestId('chart-line').props.strokeDashoffset ?? 0).toBe(0);
    expect(screen.getByTestId('chart-fill-layer')).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    expect(screen.getByTestId('chart-dotted-layer')).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.getByTestId('chart-dots-layer')).toHaveAnimatedStyle({ opacity: 1 });
    // Nothing pulses
    expect(screen.queryByTestId('chart-pulse')).toBeNull();
  });

  it('animate false shows everything at once, and the current month still pulses', async () => {
    await renderChart({ animate: false });
    await jest.advanceTimersByTimeAsync(20);

    // Fully drawn (an offset of 0 reaches the native line as null)
    expect(screen.getByTestId('chart-line').props.strokeDashoffset ?? 0).toBe(0);
    expect(screen.getByTestId('chart-fill-layer')).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    expect(screen.getByTestId('chart-dots-layer')).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.getByTestId('chart-pulse')).toBeOnTheScreen();
  });

  it('the selected point gets a halo, a bigger dot and a guide to the bottom', async () => {
    const { rerender } = await renderChart({ selectedIndex: 3 });
    const { cx, cy } = dot(3);
    const guide = screen.getByTestId('chart-guide').props;

    expect(screen.getByTestId('chart-halo').props).toMatchObject({ cx, cy, r: 9, opacity: 0.25 });
    expect(screen.getByTestId('chart-selected-dot').props).toMatchObject({ cx, cy, r: 4.5 });
    expect(guide).toMatchObject({ x1: cx, x2: cx, y1: cy });
    expect(guide.y2).toBeGreaterThan(cy);
    // Its month label is bold and not faded
    expect(screen.getByText('Sep')).toHaveStyle({ fontWeight: '700' });
    expect(screen.getByTestId('chart-label-3')).toHaveStyle({ opacity: 1 });
    expect(screen.getByText('Nov')).not.toHaveStyle({ fontWeight: '700' });

    // Nothing selected: the last month's label is the bold one
    await rerender(lineChart({ selectedIndex: null }));

    expect(screen.queryByTestId('chart-halo')).toBeNull();
    expect(screen.getByText('Nov')).toHaveStyle({ fontWeight: '700' });
  });

  it('the faded month labels stay readable on every header colour', async () => {
    for (const [preference, colors] of [
      ['light', lightColors],
      ['dark', darkColors],
    ] as const) {
      const { unmount } = await renderChart({}, preference);
      const { opacity } = StyleSheet.flatten(screen.getByTestId('chart-label-0').props.style);
      // The label colour at that opacity, as `rgba(…)`, to measure it
      const [red, green, blue] = [1, 3, 5].map((start) => parseInt(colors.onBrand.slice(start, start + 2), 16));
      const label = `rgba(${red},${green},${blue},${opacity})`;

      expect(screen.getByText('Jun')).toHaveStyle({ color: colors.onBrand });
      expect(opacity).toBeGreaterThanOrEqual(0.75);

      for (const stop of colors.headerGradient) {
        expect(contrastRatio(label, stop)).toBeGreaterThanOrEqual(4.5);
      }

      await unmount();
    }
  });

  it('screen readers hear one adjustable chart and swipe through the months', async () => {
    const onSelect = jest.fn();
    const { rerender } = await renderChart({ onSelect });
    const chart = () => screen.getByRole('adjustable', { name: 'Spending chart' });

    // The current month, with its projection
    expect(chart().props.accessibilityValue).toEqual({ text: 'November 2026, €84.60, ≈ €149.29 by month end' });

    await fireEvent(chart(), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });

    expect(onSelect).toHaveBeenLastCalledWith(4);

    await rerender(lineChart({ onSelect, selectedIndex: 3, projection: null }));

    expect(chart().props.accessibilityValue).toEqual({ text: 'September 2026, €118.60' });

    await fireEvent(chart(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });

    expect(onSelect).toHaveBeenLastCalledWith(4);
  });

  it('lineChartHeight is the drawn height, for each size and text size (Home counts on it)', async () => {
    const { fontScale } = Dimensions.get('window');
    const { rerender } = await renderChart();

    expect(StyleSheet.flatten(screen.getByTestId('line-chart').props.style).height).toBe(lineChartHeight('header', fontScale));

    await rerender(lineChart({ size: 'large', loading: true }));

    expect(StyleSheet.flatten(screen.getByTestId('line-chart').props.style).height).toBe(lineChartHeight('large', fontScale));
  });

  it('each size takes its height from its token', async () => {
    const { rerender } = await renderChart();
    const header = StyleSheet.flatten(screen.getByTestId('line-chart').props.style).height;

    await rerender(lineChart({ size: 'large' }));
    const large = StyleSheet.flatten(screen.getByTestId('line-chart').props.style).height;

    expect(large - header).toBe(sizes.chartLarge - sizes.chartHeader);
  });
});
