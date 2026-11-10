import { useEffect } from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme';
import { Dot } from './HealthDot';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

type BreakdownBarProps = {
  // Biggest first; the last one is usually "Other"
  segments: readonly { label: string; value: number; formatted: string }[];
  // Placeholders in its own shape (the bar, then a full legend) while the amounts load
  loading?: boolean;
};

// One colour per segment (the theme's four series colours)
const MAX_SEGMENTS = 4;
// From the approved mockup
const BAR_HEIGHT = 8;
const BAR_GAP = 2;

// A stacked bar of amounts, then a legend row per segment: what money went where.
export function BreakdownBar({ segments, loading = false }: BreakdownBarProps) {
  const { colors, radii, spacing } = useTheme();
  // Keyed by place: two segments may share a label (two unknown projects)
  const shown = segments.slice(0, MAX_SEGMENTS).map(({ label, value, formatted }, index) => ({
    key: index,
    label,
    formatted,
    share: value,
    color: colors.series[index] ?? colors.divider,
  }));
  // A segment with nothing in it takes no room (and no gap) in the bar
  const filled = shown.filter((segment) => segment.share > 0);

  useEffect(() => {
    if (__DEV__ && segments.length > MAX_SEGMENTS) {
      console.error(`BreakdownBar shows at most 4 segments, got ${segments.length}: group the rest into "Other".`);
    }
  }, [segments.length]);

  if (loading) {
    return (
      <View style={{ gap: spacing.sm }}>
        <Skeleton width="100%" height={BAR_HEIGHT} radius="pill" />

        <View style={{ gap: spacing.xs }}>
          {Array.from({ length: MAX_SEGMENTS }, (_, index) => (
            <Skeleton key={index} width="100%" />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        testID="breakdown-bar"
        // The legend says the same in words
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: 'row',
          height: BAR_HEIGHT,
          gap: BAR_GAP,
          borderRadius: radii.pill,
          overflow: 'hidden',
        }}
      >
        {filled.length === 0 ? (
          <View testID="breakdown-empty" style={{ flexGrow: 1, backgroundColor: colors.divider }} />
        ) : null}

        {filled.map((segment) => (
          <View
            key={segment.key}
            testID="breakdown-segment"
            style={{ flexGrow: segment.share, flexBasis: 0, backgroundColor: segment.color }}
          />
        ))}
      </View>

      <View style={{ gap: spacing.xs }}>
        {shown.map((segment) => (
          <View
            key={segment.key}
            accessible
            accessibilityLabel={`${segment.label}, ${segment.formatted}`}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}
          >
            <Dot color={segment.color} line="body" testID="breakdown-dot" />

            <View style={{ flex: 1 }}>
              <Text variant="body">{segment.label}</Text>
            </View>

            <Text variant="body" tone="muted">
              {segment.formatted}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
