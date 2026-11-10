import { useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Text } from '../components/Text';
import { useTheme } from '../theme';
import { typography } from '../tokens';
import { chartGeometry, monotonePath } from './geometry';

type MetricChartProps = {
  // What it measures, and over when: "CPU", "Reachability (24 h)"
  title: string;
  // Oldest first, evenly spaced in time. A long series is thinned to the chart's width
  points: readonly { value: number }[];
  // '%': the scale runs from 0 to 100
  unit: '%';
  // The words top-right instead of the latest value
  valueLabel?: string;
  // Placeholders in the value's and the line's place while the points load
  loading?: boolean;
};

// The look
const LINE_WIDTH = 2;
const FILL_OPACITY = 0.18;
const END_RADIUS = 3;
// At most one point every 2 pt: more can't be seen
const POINT_SPACING = 2;
// A percentage's scale
const PERCENT = { min: 0, max: 100 };
// About the width of a value ("92%")
const VALUE_PLACEHOLDER = 3 * typography.headline.fontSize;

// A small, still line chart on a card: one metric over time, its latest value top-right.
export function MetricChart({ title, points, unit, valueLabel, loading = false }: MetricChartProps) {
  const { colors, sizes, spacing } = useTheme();
  const id = useId();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const values = points.map((point) => point.value);
  const format = (value: number) => `${Math.round(value)}${unit}`;
  const latest = values.at(-1);
  const shown = valueLabel ?? (latest === undefined ? '—' : format(latest));
  // Screen readers hear the whole picture: the latest value, and how low and high it went
  const spoken = [
    title,
    latest === undefined ? (valueLabel ?? 'No data') : shown,
    ...(values.length > 1 ? [`lowest ${format(Math.min(...values))}`, `highest ${format(Math.max(...values))}`] : []),
  ].join(', ');
  // Thinned to the width: each point is the average of its slice of the series, and the last stays the latest
  const most = Math.max(2, Math.floor(area.width / POINT_SPACING));
  const step = (values.length - 1) / (most - 1);
  const thinned =
    values.length <= most
      ? values
      : [
          ...Array.from({ length: most - 1 }, (_, index) => {
            const slice = values.slice(Math.floor(index * step), Math.floor((index + 1) * step));

            return slice.reduce((sum, value) => sum + value, 0) / slice.length;
          }),
          ...values.slice(-1),
        ];
  // Room for the end dot on every side
  const pad = spacing.xxs;
  const spots = chartGeometry(
    thinned,
    { width: area.width, height: area.height, padX: pad, padTop: pad, padBottom: pad },
    null,
    PERCENT,
  );
  const line = monotonePath(spots);
  const first = spots[0];
  const last = spots.at(-1);
  const filled =
    first !== undefined && last !== undefined
      ? `${line}L${last.x},${area.height}L${first.x},${area.height}Z`
      : '';

  return (
    <Card>
      <View
        accessible
        accessibilityRole={loading ? 'progressbar' : 'image'}
        accessibilityLabel={loading ? title : spoken}
        accessibilityState={loading ? { busy: true } : undefined}
        style={{ gap: spacing.xs }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <View style={{ flexShrink: 1 }}>
            <Text variant="subhead" tone="muted">
              {title}
            </Text>
          </View>

          {loading ? <Skeleton width={VALUE_PLACEHOLDER} variant="headline" /> : <Text variant="headline">{shown}</Text>}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <View
            testID="metric-chart-area"
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;

              setArea({ width, height });
            }}
            // A minimum: taller captions (large text) make it taller, never cut
            style={{ flex: 1, minHeight: sizes.chartMetric }}
          >
            {loading ? (
              <Skeleton width="100%" height={sizes.chartMetric} radius="md" />
            ) : area.width > 0 && last !== undefined ? (
              <Svg width={area.width} height={area.height}>
                <Defs>
                  <LinearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={colors.brand} stopOpacity={FILL_OPACITY} />

                    <Stop offset="1" stopColor={colors.brand} stopOpacity={0} />
                  </LinearGradient>
                </Defs>

                <Path testID="metric-fill" d={filled} fill={`url(#${id}-fill)`} />

                <Path
                  testID="metric-line"
                  d={line}
                  fill="none"
                  stroke={colors.brand}
                  strokeWidth={LINE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <Circle testID="metric-end" cx={last.x} cy={last.y} r={END_RADIUS} fill={colors.brand} />
              </Svg>
            ) : null}
          </View>

          <View style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Text variant="caption" tone="muted">
              {format(PERCENT.max)}
            </Text>

            <Text variant="caption" tone="muted">
              {format(PERCENT.min)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}
