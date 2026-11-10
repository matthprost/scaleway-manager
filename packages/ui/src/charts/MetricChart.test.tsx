import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { Dimensions, processColor, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { ThemeProvider } from '../theme';
import { contrastRatio, darkColors, lightColors, sizes, spacing, typography } from '../tokens';
import { MetricChart } from './MetricChart';

type MetricChartProps = ComponentProps<typeof MetricChart>;

// CPU over the last hours, ending at 92% (demo db-main)
const CPU = [12, 18, 35, 30, 64, 71, 92].map((value) => ({ value }));

function metricChart(overrides: Partial<MetricChartProps> = {}, preference: 'light' | 'dark' = 'light') {
  return (
    <ThemeProvider preference={preference}>
      <MetricChart title="CPU" points={CPU} unit="%" {...overrides} />
    </ThemeProvider>
  );
}

// The chart draws once it knows the size of its line's area
async function renderChart(
  overrides: Partial<MetricChartProps> = {},
  preference: 'light' | 'dark' = 'light',
  width = 300,
) {
  const result = await render(metricChart(overrides, preference));

  await fireEvent(screen.getByTestId('metric-chart-area'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: sizes.chartMetric } },
  });

  return result;
}

const line = () => screen.getByTestId('metric-line').props as { d: string; stroke: unknown; strokeDasharray?: unknown };
const end = () => screen.getByTestId('metric-end').props as { cx: number; cy: number };
// The pieces of the line: one curve per point after the first
const pieces = (path: string) => (path.match(/C/g) ?? []).length;

// Inside the line's area, room for the end dot: 100% sits this far from the top, 0% this far from the bottom
const PAD = spacing.xxs;
const yOf = (percent: number) => sizes.chartMetric - PAD - (percent / 100) * (sizes.chartMetric - 2 * PAD);

describe('MetricChart', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('MetricChart shows the latest value', async () => {
    await renderChart();

    // The latest value top-right, big enough to read at a glance; the title beside it
    expect(screen.getByText('92%')).toHaveStyle({
      fontSize: typography.headline.fontSize,
      color: lightColors.text,
    });
    expect(screen.getByText('CPU')).toHaveStyle({ fontSize: typography.subhead.fontSize, color: lightColors.textMuted });
    // The scale's ends, as captions
    expect(screen.getByText('100%')).toHaveStyle({ fontSize: typography.caption.fontSize, color: lightColors.textMuted });
    expect(screen.getByText('0%')).toHaveStyle({ fontSize: typography.caption.fontSize, color: lightColors.textMuted });
    // The line ends on the latest value, marked by a dot
    expect(end().cx).toBeCloseTo(300 - PAD, 9);
    expect(end().cy).toBeCloseTo(yOf(92), 9);
  });

  it('MetricChart handles a single point', async () => {
    await renderChart({ points: [{ value: 40 }] });

    expect(JSON.stringify(screen.toJSON())).not.toContain('NaN');
    // One point: a dot in the middle, at its value
    expect(end().cx).toBe(150);
    expect(end().cy).toBeCloseTo(yOf(40), 9);
    expect(screen.getByText('40%')).toBeOnTheScreen();
  });

  it('places a percentage on a fixed scale from 0 to 100', async () => {
    await renderChart({ points: [{ value: 0 }, { value: 100 }, { value: 130 }] });

    // Out of range stays inside the chart, and still says the real value
    expect(end().cy).toBeCloseTo(yOf(100), 9);
    expect(line().d.startsWith(`M${PAD},${yOf(0)}`)).toBe(true);
    expect(screen.getByText('130%')).toBeOnTheScreen();
  });

  it('thins a long series to its width, and still ends on the latest value', async () => {
    // A day of pings, one a minute: up, except the last one
    const pings = Array.from({ length: 1440 }, (_, index) => ({ value: index === 1439 ? 0 : 100 }));
    await renderChart({ title: 'Reachability (24 h)', points: pings }, 'light', 300);

    // About one point every 2 pt
    expect(pieces(line().d)).toBeLessThanOrEqual(150);
    expect(pieces(line().d)).toBeGreaterThan(100);
    expect(end().cy).toBeCloseTo(yOf(0), 9);
    // The latest value, and the scale's bottom caption
    expect(screen.getAllByText('0%')).toHaveLength(2);
  });

  it('draws a brand line over a brand fill fading to nothing, in light and dark', async () => {
    for (const [preference, colors] of [
      ['light', lightColors],
      ['dark', darkColors],
    ] as const) {
      const { unmount } = await renderChart({}, preference);
      // The fill's gradient: [offset, colour, offset, colour], each colour's alpha being its stop's opacity
      const gradient = JSON.stringify(screen.toJSON()).match(/"gradient":\[([^\]]*)\]/)?.[1]?.split(',').map(Number);
      const [, top = 0, , bottom = 0] = gradient ?? [];
      const brand = Number(processColor(colors.brand)) & 0xffffff;

      expect(line().stroke).toEqual({ type: 0, payload: processColor(colors.brand) });
      expect(top & 0xffffff).toBe(brand);
      expect(bottom & 0xffffff).toBe(brand);
      expect((top >>> 24) / 255).toBeCloseTo(0.18, 2);
      expect(bottom >>> 24).toBe(0);
      // The line is a graphic: 3:1 on its card
      expect(contrastRatio(colors.brand, colors.surface)).toBeGreaterThanOrEqual(3);
      // On its own card
      expect(screen.getByRole('image').parent).toHaveStyle({ backgroundColor: colors.surface });

      await unmount();
    }
  });

  it("doesn't move: the line is whole as soon as it's drawn", async () => {
    await renderChart();

    expect(line().strokeDasharray).toBeUndefined();
  });

  it('is one image for screen readers: the title, the latest value, the lowest and the highest', async () => {
    await renderChart();

    expect(screen.getByRole('image', { name: 'CPU, 92%, lowest 12%, highest 92%' })).toBeOnTheScreen();
  });

  it('valueLabel says the top-right words instead of the latest value', async () => {
    await renderChart({ title: 'Reachability (24 h)', valueLabel: 'Up' });

    expect(screen.getByText('Up')).toHaveStyle({ fontSize: typography.headline.fontSize });
    expect(screen.queryByText('92%')).not.toBeOnTheScreen();
    expect(screen.getByRole('image', { name: 'Reachability (24 h), Up, lowest 12%, highest 92%' })).toBeOnTheScreen();
  });

  it('with no points yet, it shows a dash and no line', async () => {
    await renderChart({ points: [] });

    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.queryByTestId('metric-line')).not.toBeOnTheScreen();
    expect(screen.getByRole('image', { name: 'CPU, No data' })).toBeOnTheScreen();
  });

  it("its line's area is a token high, and grows with the text size instead of cutting its captions", async () => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 3 });
    await render(metricChart());

    expect(screen.getByTestId('metric-chart-area')).toHaveStyle({ minHeight: sizes.chartMetric });
  });

  it("loading draws placeholders in the chart's place, read as busy", async () => {
    await render(metricChart({ loading: true }));
    const { fontScale } = Dimensions.get('window');

    expect(screen.getByRole('progressbar', { name: 'CPU' }).props.accessibilityState).toMatchObject({ busy: true });
    expect(screen.queryByTestId('metric-line')).not.toBeOnTheScreen();
    // The latest value's line, then the line's area
    expect(
      screen
        .getAllByTestId('skeleton', { includeHiddenElements: true })
        .map((skeleton) => StyleSheet.flatten(skeleton.props.style as StyleProp<ViewStyle>)?.height),
    ).toEqual([typography.headline.lineHeight * fontScale, sizes.chartMetric]);
  });
});
