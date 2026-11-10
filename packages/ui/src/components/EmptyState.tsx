import { View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { Text } from './Text';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  message?: string;
  // note: why it's disabled ("You're offline"), right under the button
  action?: { label: string; onPress: () => void; disabled?: boolean; note?: string };
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
      <Icon name={icon} size="lg" tone="muted" />

      <Text variant="title" align="center">
        {title}
      </Text>

      {message ? (
        <Text variant="body" tone="muted" align="center">
          {message}
        </Text>
      ) : null}

      {action ? (
        <View testID="empty-state-action" style={{ alignItems: 'center', gap: spacing.xs }}>
          <Button label={action.label} size="md" disabled={action.disabled} onPress={action.onPress} />

          {action.note ? (
            <Text variant="caption" tone="muted" align="center">
              {action.note}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
