import { useEffect, useId, useRef, useState } from 'react';
import type { AccessibilityActionInfo, GestureResponderEvent } from 'react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Skeleton } from '../components/Skeleton';
import { Text } from '../components/Text';
import { useTheme } from '../theme';
import { sizes, spacing, typography } from '../tokens';
import { chartGeometry, monotoneLengths, monotonePieces } from './geometry';

// One step of the chart (a month)
export type ChartPoint = {
  key: string;
  // Shown under the point: 'Nov', or 'N' when there are many
  label: string;
  value: number;
  // What screen readers say for it: 'November 2026, €84.60'
  description: string;
};

type LineChartProps = {
  points: ChartPoint[];
  // The last point is still running (this month): a dotted, lighter, pulsing last piece
  unfinishedLast: boolean;
  // Where the last point is heading, with its words ('≈ €149.29 by month end'). Always part of the scale.
  projection: { value: number; label: string } | null;
  // false: the projection keeps the scale but isn't drawn (a past month is shown), so nothing moves
  projectionVisible?: boolean;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  // 'header' on Home, 'large' on Billing
  size: 'header' | 'large';
  // false: shows at once, without drawing itself in
  animate?: boolean;
  // Placeholders at the chart's exact height, while the months load
  loading?: boolean;
};

// The look, from the approved mockup
const LINE_WIDTH = 2.4;
const DOTTED = [1, 5];
const DOTTED_WIDTH = 2.2;
const DOTTED_OPACITY = 0.8;
// A little stronger in dark mode, so the lavender glows
const FILL_OPACITY = { light: 0.38, dark: 0.45 };
const UNFINISHED_FILL_OPACITY = { light: 0.16, dark: 0.18 };
const DOT_RADIUS = 3;
const DOT_STROKE = 1.6;
// The running month's dot is a little bigger, with a thicker ring
const CURRENT_RADIUS = 4;
const CURRENT_STROKE = 2;
const PULSE_SCALE = 2.3;
const PULSE_OPACITY = 0.6;
const HALO_RADIUS = 9;
const HALO_OPACITY = 0.25;
const SELECTED_RADIUS = 4.5;
const SELECTED_STROKE = 2;
const GUIDE_OPACITY = 0.55;
const PROJECTION_DASH = [2, 3];
const PROJECTION_LINE_OPACITY = 0.35;
const PROJECTION_RADIUS = 2.6;
const PROJECTION_STROKE = 1.2;
const PROJECTION_DOT_OPACITY = 0.6;
// White at 75% stays above 4.5:1 on every header colour (bible, Contrast)
const LABEL_OPACITY = 0.75;

const ADJUST: AccessibilityActionInfo[] = [{ name: 'increment' }, { name: 'decrement' }];

const AnimatedPath = Animated.createAnimatedComponent(Path);

// How tall the chart is: a caption line (the projection's words), the line's area, 4, a caption line (the months).
export function lineChartHeight(size: 'header' | 'large', fontScale: number): number {
  const labelRoom = typography.caption.lineHeight * fontScale;

  return labelRoom + (size === 'header' ? sizes.chartHeader : sizes.chartLarge) + spacing.xxs + labelRoom;
}

// The spending chart on purple: a soft white line with small dots and a fill fading down from it.
export function LineChart({
  points,
  unfinishedLast,
  projection,
  projectionVisible = true,
  selectedIndex,
  onSelect,
  size,
  animate = true,
  loading = false,
}: LineChartProps) {
  const { scheme, colors, radii, sizes, spacing, typography, motion } = useTheme();
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const id = useId();
  const [width, setWidth] = useState(0);
  const atOnce = reduceMotion || !animate;
  const draw = useSharedValue(atOnce ? 1 : 0);
  const fill = useSharedValue(atOnce ? 1 : 0);
  const dotted = useSharedValue(atOnce ? 1 : 0);
  const dots = useSharedValue(atOnce ? 1 : 0);
  const pulse = useSharedValue(0);
  const started = useRef(false);
  // Where the finger went down, what it's doing ('tap' until it moves), and the month last sent
  const touch = useRef<{ x: number; y: number; mode: 'tap' | 'scrub' | 'scroll'; picked: number | null }>({
    x: 0,
    y: 0,
    mode: 'tap',
    picked: null,
  });
  const { duration, distance, easing } = motion;

  // One caption line, grown with the text size: the projection's words above, the month labels below
  const labelRoom = typography.caption.lineHeight * fontScale;
  const area = size === 'header' ? sizes.chartHeader : sizes.chartLarge;
  const drawingHeight = labelRoom + area;
  const last = points.length - 1;
  const selected = selectedIndex !== null && selectedIndex >= 0 && selectedIndex <= last ? selectedIndex : null;
  // The point the chart is about: the selected one, or the last
  const shown = selected ?? last;
  const scaled = chartGeometry(
    points.map((point) => point.value),
    // Room under the lowest month, so the fill shows under every month
    { width, height: drawingHeight, padX: spacing.sm, padTop: labelRoom + HALO_RADIUS, padBottom: spacing.xxl },
    projection?.value ?? null,
  );
  const spots = projection === null ? scaled : scaled.slice(0, -1);
  const projected = projection !== null && projectionVisible ? scaled.at(-1) : undefined;
  const [firstSpot, secondSpot] = spots;
  const lastSpot = spots.at(-1);
  const selectedSpot = selected === null ? undefined : spots[selected];
  // The last piece is dotted: the solid line and its fill stop where it starts. Each part is its own
  // shape, never a clip: a clip that moves (6M ↔ 12M) can be left behind by the native drawing.
  const splitSpot = unfinishedLast && spots.length > 1 ? spots.at(-2) : undefined;
  const pieces = monotonePieces(spots);
  const solidLine =
    firstSpot === undefined
      ? ''
      : `M${firstSpot.x},${firstSpot.y}${(splitSpot === undefined ? pieces : pieces.slice(0, -1)).join('')}`;
  const solidEnd = splitSpot ?? lastSpot;
  const solidFill =
    firstSpot !== undefined && solidEnd !== undefined
      ? `${solidLine}L${solidEnd.x},${drawingHeight}L${firstSpot.x},${drawingHeight}Z`
      : '';
  const dottedLine = splitSpot === undefined ? '' : `M${splitSpot.x},${splitSpot.y}${pieces.at(-1) ?? ''}`;
  const dottedFill =
    splitSpot !== undefined && lastSpot !== undefined
      ? `${dottedLine}L${lastSpot.x},${drawingHeight}L${splitSpot.x},${drawingHeight}Z`
      : '';
  const lengths = monotoneLengths(spots);
  const solidLength = (splitSpot === undefined ? lengths : lengths.slice(0, -1)).reduce((sum, length) => sum + length, 0);
  const wholeLength = lengths.reduce((sum, length) => sum + length, 0);
  // Both fills fade from the line's highest month down to the bottom, as one fill would
  const fillTop = Math.min(...spots.map((spot) => spot.y), drawingHeight);
  // A small gap between neighbours, so shrunk labels never touch
  const labelWidth =
    firstSpot !== undefined && secondSpot !== undefined ? secondSpot.x - firstSpot.x - spacing.xxs : width;
  // Not behind the placeholders: it starts with the dots once the months arrive
  const pulsing = unfinishedLast && !reduceMotion && !loading;
  const shownPoint = points[shown];
  const spoken =
    shownPoint === undefined
      ? undefined
      : projection !== null && projectionVisible && shown === last
        ? `${shownPoint.description}, ${projection.label}`
        : shownPoint.description;

  // The line draws itself, then the fill rises and the dots appear (once it knows its width)
  useEffect(() => {
    if (atOnce) {
      draw.value = 1;
      fill.value = 1;
      dotted.value = 1;
      dots.value = 1;

      return;
    }

    // Not while the placeholders show: it draws itself in when the months arrive
    if (width === 0 || loading || started.current) {
      return;
    }

    started.current = true;

    const [s1, s2, s3, s4] = easing.standard;
    const [e1, e2, e3, e4] = easing.enter;
    const arrive = Easing.bezier(e1, e2, e3, e4);

    draw.value = withTiming(1, { duration: duration.chartDraw, easing: Easing.bezier(s1, s2, s3, s4) });
    fill.value = withDelay(duration.chartFillDelay, withTiming(1, { duration: duration.chartFillRise, easing: arrive }));
    dotted.value = withDelay(duration.chartDraw, withTiming(1, { duration: duration.chartDottedFade, easing: arrive }));
    dots.value = withDelay(duration.chartDotsDelay, withTiming(1, { duration: duration.slow, easing: arrive }));
  }, [atOnce, width, loading, draw, fill, dotted, dots, duration, easing]);

  // The current month's dot pulses, from when the dots appear
  useEffect(() => {
    if (!pulsing) {
      cancelAnimation(pulse);
      pulse.value = 0;

      return;
    }

    const [g1, g2, g3, g4] = easing.glide;

    pulse.value = withDelay(
      animate ? duration.chartDotsDelay : 0,
      withRepeat(withTiming(1, { duration: duration.chartPulse / 2, easing: Easing.bezier(g1, g2, g3, g4) }), -1, true),
    );
  }, [pulsing, animate, pulse, duration, easing]);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: (1 - draw.value) * solidLength }), [solidLength]);
  const fillStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ translateY: (1 - fill.value) * distance.chartRise }],
  }));
  const dottedStyle = useAnimatedStyle(() => ({ opacity: dotted.value }));
  const dotsStyle = useAnimatedStyle(() => ({ opacity: dots.value }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: PULSE_OPACITY * (1 - pulse.value),
    transform: [{ scale: 1 + (PULSE_SCALE - 1) * pulse.value }],
  }));

  // Snaps a tap or a drag to the nearest point, sending each month once
  const pick = (event: GestureResponderEvent) => {
    const { locationX } = event.nativeEvent;
    const nearest = spots.reduce(
      (best, spot, index) =>
        Math.abs(spot.x - locationX) < Math.abs((spots[best]?.x ?? Infinity) - locationX) ? index : best,
      0,
    );

    if (spots.length > 0 && nearest !== touch.current.picked) {
      touch.current.picked = nearest;
      onSelect(nearest);
    }
  };

  const svgSize = { width, height: drawingHeight };
  const height = lineChartHeight(size, fontScale);

  // Nothing to adjust yet: a busy progress bar. Measured too, so the chart can draw when the months arrive.
  if (loading) {
    return (
      <View
        testID="line-chart"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Spending chart"
        accessibilityState={{ busy: true }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ height, paddingTop: labelRoom, gap: spacing.xxs }}
      >
        <Skeleton width="100%" height={area} radius="md" tone="onBrand" />

        <Skeleton width="100%" height={labelRoom} tone="onBrand" />
      </View>
    );
  }

  return (
    <View
      testID="line-chart"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Spending chart"
      accessibilityValue={spoken === undefined ? undefined : { text: spoken }}
      accessibilityActions={ADJUST}
      onAccessibilityAction={({ nativeEvent }) => {
        const step = nativeEvent.actionName === 'increment' ? 1 : nativeEvent.actionName === 'decrement' ? -1 : 0;
        const next = Math.min(last, Math.max(0, shown + step));

        if (next !== shown) {
          onSelect(next);
        }
      }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height }}
    >
      {width > 0 ? (
        <View style={{ height: drawingHeight }}>
          <Animated.View testID="chart-fill-layer" style={[StyleSheet.absoluteFill, fillStyle]}>
            <Svg {...svgSize}>
              <Defs>
                <LinearGradient
                  id={`${id}-fill`}
                  gradientUnits="userSpaceOnUse"
                  x1={0}
                  y1={fillTop}
                  x2={0}
                  y2={drawingHeight}
                >
                  <Stop offset="0" stopColor={colors.chartFill} stopOpacity={FILL_OPACITY[scheme]} />

                  <Stop offset="1" stopColor={colors.chartFill} stopOpacity={0} />
                </LinearGradient>

                <LinearGradient
                  id={`${id}-fill-light`}
                  gradientUnits="userSpaceOnUse"
                  x1={0}
                  y1={fillTop}
                  x2={0}
                  y2={drawingHeight}
                >
                  <Stop offset="0" stopColor={colors.chartFill} stopOpacity={UNFINISHED_FILL_OPACITY[scheme]} />

                  <Stop offset="1" stopColor={colors.chartFill} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              <Path testID="chart-fill" d={solidFill} fill={`url(#${id}-fill)`} />

              {splitSpot !== undefined ? (
                <Path testID="chart-fill-unfinished" d={dottedFill} fill={`url(#${id}-fill-light)`} />
              ) : null}
            </Svg>
          </Animated.View>

          <Svg {...svgSize} style={StyleSheet.absoluteFill}>
            {selectedSpot !== undefined ? (
              <Line
                testID="chart-guide"
                x1={selectedSpot.x}
                y1={selectedSpot.y}
                x2={selectedSpot.x}
                y2={drawingHeight}
                stroke={colors.onBrand}
                strokeOpacity={GUIDE_OPACITY}
                strokeWidth={1}
              />
            ) : null}

            <AnimatedPath
              testID="chart-line"
              d={solidLine}
              fill="none"
              stroke={colors.onBrand}
              strokeWidth={LINE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              // One dash as long as the solid line, then a gap past the end; sliding it in draws the line
              strokeDasharray={[solidLength, wholeLength]}
              animatedProps={lineProps}
            />
          </Svg>

          <Animated.View testID="chart-dotted-layer" style={[StyleSheet.absoluteFill, dottedStyle]}>
            <Svg {...svgSize}>
              {splitSpot !== undefined ? (
                <Path
                  testID="chart-dotted"
                  d={dottedLine}
                  fill="none"
                  stroke={colors.onBrand}
                  strokeOpacity={DOTTED_OPACITY}
                  strokeWidth={DOTTED_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={DOTTED}
                />
              ) : null}

              {projected !== undefined && lastSpot !== undefined ? (
                <Line
                  testID="chart-projection-line"
                  x1={lastSpot.x}
                  y1={lastSpot.y}
                  x2={projected.x}
                  y2={projected.y}
                  stroke={colors.onBrand}
                  strokeOpacity={PROJECTION_LINE_OPACITY}
                  strokeWidth={1}
                  strokeDasharray={PROJECTION_DASH}
                />
              ) : null}

              {projected !== undefined ? (
                <Circle
                  testID="chart-projection-dot"
                  cx={projected.x}
                  cy={projected.y}
                  r={PROJECTION_RADIUS}
                  fill="none"
                  stroke={colors.onBrand}
                  strokeOpacity={PROJECTION_DOT_OPACITY}
                  strokeWidth={PROJECTION_STROKE}
                />
              ) : null}
            </Svg>

            {projection !== null && projected !== undefined ? (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: projected.x - spacing.xxs,
                  height: labelRoom,
                  alignItems: 'flex-end',
                }}
              >
                <View style={{ opacity: LABEL_OPACITY }}>
                  <Text variant="caption" tone="onBrand" shrinkToFit>
                    {projection.label}
                  </Text>
                </View>
              </View>
            ) : null}
          </Animated.View>

          <Animated.View testID="chart-dots-layer" style={[StyleSheet.absoluteFill, dotsStyle]}>
            {pulsing && lastSpot !== undefined ? (
              <Animated.View
                testID="chart-pulse"
                style={[
                  {
                    position: 'absolute',
                    left: lastSpot.x - CURRENT_RADIUS,
                    top: lastSpot.y - CURRENT_RADIUS,
                    width: 2 * CURRENT_RADIUS,
                    height: 2 * CURRENT_RADIUS,
                    borderRadius: radii.pill,
                    backgroundColor: colors.onBrand,
                  },
                  pulseStyle,
                ]}
              />
            ) : null}

            <Svg {...svgSize}>
              {spots.map((spot, index) => {
                const current = unfinishedLast && index === last;

                return (
                  <Circle
                    key={points[index]?.key ?? index}
                    testID={`chart-dot-${index}`}
                    cx={spot.x}
                    cy={spot.y}
                    r={current ? CURRENT_RADIUS : DOT_RADIUS}
                    fill={colors.onBrand}
                    stroke={colors.chartDotRing}
                    strokeWidth={current ? CURRENT_STROKE : DOT_STROKE}
                  />
                );
              })}

              {selectedSpot !== undefined ? (
                <Circle
                  testID="chart-halo"
                  cx={selectedSpot.x}
                  cy={selectedSpot.y}
                  r={HALO_RADIUS}
                  fill={colors.onBrand}
                  opacity={HALO_OPACITY}
                />
              ) : null}

              {selectedSpot !== undefined ? (
                <Circle
                  testID="chart-selected-dot"
                  cx={selectedSpot.x}
                  cy={selectedSpot.y}
                  r={SELECTED_RADIUS}
                  fill={colors.onBrand}
                  stroke={colors.chartDotRing}
                  strokeWidth={SELECTED_STROKE}
                />
              ) : null}
            </Svg>
          </Animated.View>
        </View>
      ) : null}

      {width > 0 ? (
        <View style={{ height: labelRoom, marginTop: spacing.xxs }}>
          {points.map((point, index) => {
            const x = spots[index]?.x ?? 0;
            // End labels may use the padding around the chart, but stop 16 pt past its sides
            const room = Math.min(labelWidth, 2 * (x + spacing.md), 2 * (width - x + spacing.md));

            return (
              <View
                key={point.key}
                testID={`chart-label-${index}`}
                style={{
                  position: 'absolute',
                  left: x - room / 2,
                  width: room,
                  alignItems: 'center',
                  opacity: index === shown ? 1 : LABEL_OPACITY,
                }}
              >
                <Text variant="caption" tone="onBrand" bold={index === shown} shrinkToFit>
                  {point.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View
        testID="chart-touch"
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onResponderGrant={({ nativeEvent }) => {
          touch.current = { x: nativeEvent.pageX, y: nativeEvent.pageY, mode: 'tap', picked: selected };
        }}
        onResponderMove={(event) => {
          const { pageX, pageY } = event.nativeEvent;
          const sideways = Math.abs(pageX - touch.current.x);
          const upOrDown = Math.abs(pageY - touch.current.y);

          // A sideways drag picks months; an up-or-down one belongs to the scroll view
          if (touch.current.mode === 'tap' && Math.max(sideways, upOrDown) > spacing.xs) {
            touch.current.mode = sideways > upOrDown ? 'scrub' : 'scroll';
          }

          if (touch.current.mode === 'scrub') {
            pick(event);
          }
        }}
        onResponderRelease={(event) => {
          if (touch.current.mode === 'tap') {
            pick(event);
          }
        }}
        onResponderTerminationRequest={() => touch.current.mode !== 'scrub'}
      />
    </View>
  );
}
