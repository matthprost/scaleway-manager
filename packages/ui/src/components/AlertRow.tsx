import { View } from 'react-native';

import { useTheme } from '../theme';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { Text } from './Text';
import type { Tone } from './Text';

type AlertRowProps = {
  title: string;
  detail: string;
  // 'warning' is calmer: a soft amber row with dark words. 'info': a soft purple note to read
  tone?: 'danger' | 'warning' | 'info';
};

// The row's colours and icon, and the word screen readers hear first
type Look = { background: string; icon: IconName; iconTone: Tone; title: Tone; detail: Tone; kind: string };

// Something that needs attention now (a firing monitoring alert), or a note about a resource.
export function AlertRow({ title, detail, tone = 'danger' }: AlertRowProps) {
  const { colors, radii, sizes, spacing } = useTheme();
  // `kind` is said first to screen readers: the row's colour says it only to the eye
  const look = ({
    danger: {
      background: colors.alertBackground,
      icon: 'alert',
      iconTone: 'danger',
      title: 'danger',
      detail: 'danger',
      kind: 'Alert',
    },
    warning: {
      background: colors.warningBackground,
      icon: 'alert',
      iconTone: 'default',
      title: 'default',
      detail: 'muted',
      kind: 'Warning',
    },
    // Only the icon is brand: brand words would be too faint on it in dark mode
    info: {
      background: colors.infoBackground,
      icon: 'info',
      iconTone: 'brand',
      title: 'default',
      detail: 'muted',
      kind: 'Note',
    },
  } satisfies Record<NonNullable<AlertRowProps['tone']>, Look>)[tone];

  return (
    <View
      testID="alert-row"
      accessible
      accessibilityLabel={`${look.kind}, ${title}, ${detail}`}
      style={{
        minHeight: sizes.listRowMin,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: look.background,
      }}
    >
      <Icon name={look.icon} tone={look.iconTone} />

      <View style={{ flex: 1 }}>
        <Text variant="headline" tone={look.title}>
          {title}
        </Text>

        <Text variant="caption" tone={look.detail}>
          {detail}
        </Text>
      </View>
    </View>
  );
}
