import { View } from 'react-native';

import { useTheme } from '../theme';
import { HealthDot } from './HealthDot';
import { Text } from './Text';

type StatusLineProps = {
  label: string;
};

// One slim line that says all is well: a green dot and its words.
export function StatusLine({ label }: StatusLineProps) {
  const { spacing } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}
    >
      <HealthDot health="ok" line="subhead" />

      <View style={{ flexShrink: 1 }}>
        <Text variant="subhead" tone="muted">
          {label}
        </Text>
      </View>
    </View>
  );
}
