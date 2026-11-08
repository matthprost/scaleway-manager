import { Children } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme';
import { Card } from './Card';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

type SectionProps = {
  title?: string;
  children?: ReactNode;
  // While rows load: row-shaped placeholders above the rows already known (children). true: a list (three);
  // 'one': a single row still coming
  loading?: boolean | 'one';
};

// How many placeholders stand for a list that loads
const LIST_PLACEHOLDERS = 3;

// A Section's small title, above its card: shown in capitals, heard as a header in its own case (Screen rows too)
export function SectionTitle({ title }: { title: string }) {
  return (
    <Text variant="caption" tone="muted" accessibilityRole="header" accessibilityLabel={title}>
      {title.toUpperCase()}
    </Text>
  );
}

// A card of rows with a thin divider between each row.
export function Section({ title, children, loading = false }: SectionProps) {
  const { colors, sizes, spacing } = useTheme();
  const placeholderCount = loading === 'one' ? 1 : loading ? LIST_PLACEHOLDERS : 0;
  // Each placeholder stands for a row: a body line (the title) above a subhead line (the subtitle)
  const placeholders = Array.from({ length: placeholderCount }, (_, index) => (
        <View
          key={`placeholder-${index}`}
          testID="row-placeholder"
          style={{ minHeight: sizes.listRowMin, justifyContent: 'center', gap: spacing.xxs }}
        >
          <Skeleton width="100%" />

          <Skeleton width="100%" variant="subhead" />
        </View>
      ));
  const rows = [...placeholders, ...Children.toArray(children)];

  return (
    <View style={{ gap: spacing.xs }}>
      {title ? <SectionTitle title={title} /> : null}

      <Card>
        {rows.map((row, index) => (
          <View key={index}>
            {index > 0 ? (
              <View testID="section-divider" style={{ height: 1, backgroundColor: colors.divider }} />
            ) : null}

            {row}
          </View>
        ))}
      </Card>
    </View>
  );
}
