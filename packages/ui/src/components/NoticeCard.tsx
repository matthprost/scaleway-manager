import { View } from 'react-native';

import { useTheme } from '../theme';
import { Card } from './Card';
import { HealthDot } from './HealthDot';
import { Icon } from './Icon';
import { Text } from './Text';

type NoticeCardProps = {
  title: string;
  // Left out when there's nothing to add
  message?: string;
  meta: string;
  tone: 'warning' | 'danger';
  onPress: () => void;
};

// A notice from outside the app that opens for more in the browser, like a Scaleway incident.
export function NoticeCard({ title, message, meta, tone, onPress }: NoticeCardProps) {
  const { spacing } = useTheme();

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={[title, message, meta].filter(Boolean).join(', ')}
      accessibilityHint="Opens in your browser"
    >
      <View style={{ gap: spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
          <HealthDot health={tone === 'warning' ? 'warning' : 'error'} line="headline" />

          <View style={{ flex: 1 }}>
            <Text variant="headline">{title}</Text>
          </View>

          <View style={{ alignSelf: 'center' }}>
            <Icon name="external" size="sm" tone="muted" />
          </View>
        </View>

        {message ? (
          <Text variant="subhead" tone="muted">
            {message}
          </Text>
        ) : null}

        <Text variant="caption" tone="muted">
          {meta}
        </Text>
      </View>
    </Card>
  );
}
