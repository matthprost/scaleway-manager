import { useWindowDimensions, View } from 'react-native';

import { useTheme } from '../theme';
import { accessibilityTextScale } from '../tokens';
import { Button } from './Button';
import type { IconName } from './Icon';
import { Stack } from './Stack';
import { Text } from './Text';

type GridAction<Key extends string> = {
  key: Key;
  // A verb: "Power off", "Reboot"
  label: string;
  icon: IconName;
  // Not offered right now, on its own
  disabled?: boolean;
};

type ActionGridProps<Key extends string> = {
  actions: readonly GridAction<Key>[];
  // Called with the tapped action's key
  onPress: (key: Key) => void;
  // Every button is off, and this says why, once, under the grid ("You're offline")
  disabledReason?: string;
  // Why the buttons that are off on their own are off, in the same place ("The server is stopped"); it turns nothing
  // off. A disabled reason is said instead
  note?: string;
  // The action that runs: its button spins, and every button waits
  busyKey?: Key | null;
};

// A resource's actions, two equal buttons per row (one per row at accessibility text sizes).
export function ActionGrid<Key extends string>({
  actions,
  onPress,
  disabledReason,
  note,
  busyKey = null,
}: ActionGridProps<Key>) {
  const { spacing } = useTheme();
  const caption = disabledReason ?? note;
  const { fontScale } = useWindowDimensions();
  // Side by side, "Power off" would break mid-word at accessibility text sizes
  const stacked = fontScale > accessibilityTextScale;
  const rows = Array.from({ length: Math.ceil(actions.length / 2) }, (_, index) =>
    actions.slice(2 * index, 2 * index + 2),
  );
  // Secondary: the screen keeps its one primary button. A running action isn't faded: busy isn't unavailable
  const button = (action: GridAction<Key>, fill: boolean) => (
    <Button
      key={action.key}
      label={action.label}
      icon={action.icon}
      size="md"
      variant="secondary"
      fill={fill}
      disabled={
        action.disabled === true || disabledReason !== undefined || (busyKey !== null && action.key !== busyKey)
      }
      loading={action.key === busyKey}
      onPress={() => onPress(action.key)}
    />
  );

  return (
    <View style={{ gap: spacing.xs }}>
      {stacked ? (
        <Stack gap="xs">{actions.map((action) => button(action, false))}</Stack>
      ) : (
        rows.map((row) => (
          <Stack key={row.map((action) => action.key).join(' ')} direction="row" gap="xs">
            {row.map((action) => button(action, true))}

            {row.length === 1 ? <View testID="action-grid-spacer" style={{ flex: 1 }} /> : null}
          </Stack>
        ))
      )}

      {caption !== undefined ? (
        <Text variant="caption" tone="muted" align="center">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
