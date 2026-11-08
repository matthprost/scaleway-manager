import { View } from 'react-native';

import { useTheme } from '../theme';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { Text } from './Text';

type PillProps = {
  label: string;
  // inverse: an app notice (offline, Demo, a Toast), not the theme's opposite
  tone: 'inverse' | 'success' | 'warning' | 'neutral' | 'danger' | 'brand';
  icon?: IconName;
};

export function Pill({ label, tone, icon }: PillProps) {
  const { colors, radii, spacing } = useTheme();
  // Dark enough for white words on every tone (4.5:1 or more)
  const background = {
    inverse: colors.inverseBadge,
    success: colors.successBadge,
    warning: colors.warningBadge,
    neutral: colors.neutralBadge,
    danger: colors.dangerBadge,
    // Busy: starting, stopping, rebooting (the same purple as its dot)
    brand: colors.primaryButton,
  }[tone];
  // Only the inverse pill floats over anything, so only it gets an edge, inside its size
  const edge = tone === 'inverse' ? 1 : 0;

  // The label may shrink, so a long one wraps inside the pill instead of running past its edge
  return (
    <View
      testID="pill"
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xxs,
        paddingHorizontal: spacing.xs - edge,
        paddingVertical: spacing.xxs - edge,
        borderRadius: radii.pill,
        borderWidth: edge,
        borderColor: colors.inverseBadgeEdge,
        backgroundColor: background,
      }}
    >
      {icon ? <Icon name={icon} size="sm" tone="onBadge" /> : null}

      <View style={{ flexShrink: 1 }}>
        <Text variant="caption" tone="onBadge">
          {label}
        </Text>
      </View>
    </View>
  );
}
