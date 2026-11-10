import { useWindowDimensions, View } from 'react-native';

import { useTheme } from '../theme';
import { accessibilityTextScale, typography } from '../tokens';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

type SpendingSummaryProps = {
  // 'Spent in November so far'
  label: string;
  // '€84.60'; null while it loads
  amount: string | null;
  // Beside the amount: 'October' / '€141.20', or 'vs August' / '+19%'. `valueLabel`: the value in words, for a sign ('—').
  comparison: { title: string; value: string; valueLabel?: string } | null;
  // Who the amount covers: 'All projects in Acme'; null while it loads
  scope: string | null;
};

// At accessibility text sizes the comparison goes under the amount
const comparisonBelow = (fontScale: number) => fontScale > accessibilityTextScale;

// How tall the summary is at a text size: its label, the amount (and its comparison under it at accessibility sizes),
// and the last line.
export function spendingSummaryHeight(fontScale: number): number {
  const line = (variant: keyof typeof typography) => typography[variant].lineHeight * fontScale;
  const comparison = line('caption') + line('headline');
  const figures = comparisonBelow(fontScale) ? line('display') + comparison : Math.max(line('display'), comparison);

  return line('subhead') + figures + line('caption');
}

// The money part of a purple header: what was spent, compared with the month before, and who it covers.
export function SpendingSummary({ label, amount, comparison, scope }: SpendingSummaryProps) {
  const { spacing } = useTheme();
  const { fontScale } = useWindowDimensions();
  const below = comparisonBelow(fontScale);
  const align = below ? 'start' : 'end';

  return (
    <View>
      <Text variant="subhead" tone="onBrand">
        {label}
      </Text>

      <View
        testID="spending-figures"
        style={{
          flexDirection: below ? 'column' : 'row',
          // A big amount at a large text size: the comparison drops under it instead of leaving the screen
          flexWrap: below ? undefined : 'wrap',
          justifyContent: 'space-between',
          alignItems: below ? 'flex-start' : 'flex-end',
          columnGap: spacing.sm,
        }}
      >
        {amount === null ? (
          <View style={{ width: below ? '100%' : '55%' }}>
            <Skeleton width="100%" variant="display" tone="onBrand" />
          </View>
        ) : (
          // One line: a number is read as one piece, so it shrinks just enough instead of breaking
          <View style={{ flexShrink: 1, maxWidth: '100%' }}>
            <Text variant="display" tone="onBrand" shrinkToFit>
              {amount}
            </Text>
          </View>
        )}

        {comparison === null ? (
          <View style={{ width: below ? '40%' : '25%', alignItems: 'flex-end' }}>
            <Skeleton width="100%" variant="caption" tone="onBrand" />

            <Skeleton width="100%" variant="headline" tone="onBrand" />
          </View>
        ) : (
          <View>
            <Text variant="caption" tone="onBrand" align={align}>
              {comparison.title}
            </Text>

            <Text variant="headline" tone="onBrand" align={align} accessibilityLabel={comparison.valueLabel}>
              {comparison.value}
            </Text>
          </View>
        )}
      </View>

      {scope === null ? (
        <View style={{ width: '45%' }}>
          <Skeleton width="100%" variant="caption" tone="onBrand" />
        </View>
      ) : (
        <Text variant="caption" tone="onBrand">
          {scope}
        </Text>
      )}
    </View>
  );
}
