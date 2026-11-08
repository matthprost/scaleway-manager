import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { Text, toneColor } from './Text';
import type { Tone } from './Text';

type ButtonProps = {
  label: string;
  onPress: () => void;
  size: 'md' | 'sm';
  variant?: 'primary' | 'secondary' | 'ghost' | 'onBrand' | 'ghostOnBrand';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  // 'end' puts the icon after the label ("See all ›")
  iconPosition?: 'start' | 'end';
  // What screen readers say when the label needs more context ("Copy Secret key"); it starts with the label
  accessibilityLabel?: string;
  // In a row of buttons: they share the row equally, and both pills stretch to the taller one
  fill?: boolean;
};

const labelTone: Record<NonNullable<ButtonProps['variant']>, Tone> = {
  primary: 'onPrimaryButton',
  secondary: 'brand',
  ghost: 'brand',
  onBrand: 'primaryButton',
  ghostOnBrand: 'onBrand',
};

export function Button({
  label,
  onPress,
  size,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'start',
  accessibilityLabel,
  fill = false,
}: ButtonProps) {
  const { colors, sizes, spacing, radii } = useTheme();
  const inactive = disabled || loading;
  const background = {
    primary: colors.primaryButton,
    secondary: colors.surface,
    ghost: 'transparent',
    onBrand: colors.onBrand,
    ghostOnBrand: 'transparent',
  }[variant];
  const tone = labelTone[variant];
  const pillMin = size === 'md' ? sizes.buttonMd : sizes.buttonSm;

  // The touch box is at least 44 high; with fill the pill fills it, so in a row both pills stretch to the taller one
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchMin,
        // A pill under 44 (sm) sits in the middle of the box
        paddingVertical: Math.max(0, (sizes.touchMin - pillMin) / 2),
        // In a row, a long label wraps instead of pushing its neighbour off the screen
        flexShrink: 1,
        flex: fill ? 1 : undefined,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <View
        testID="button-pill"
        style={{
          // A minimum, so the pill grows instead of cutting the label at the largest text sizes
          minHeight: pillMin,
          // Side by side (fill), the pill fills a box the row stretched to the taller one; alone it hugs its label,
          // or a centred button inside a scrolling page would grow into all the free space below it
          flexGrow: fill ? 1 : undefined,
          borderRadius: radii.pill,
          paddingHorizontal: size === 'md' ? spacing.xl : spacing.md,
          paddingVertical: spacing.xxs,
          backgroundColor: background,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.divider,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            flexShrink: 1,
            // Hidden while loading but still laid out, so the pill keeps its size
            opacity: loading ? 0 : 1,
          }}
        >
          {icon && iconPosition === 'start' ? <Icon name={icon} size="sm" tone={tone} /> : null}

          <View style={{ flexShrink: 1 }}>
            <Text variant="headline" tone={tone} align="center">
              {label}
            </Text>
          </View>

          {icon && iconPosition === 'end' ? <Icon name={icon} size="sm" tone={tone} /> : null}
        </View>

        {loading ? (
          <ActivityIndicator testID="button-spinner" color={toneColor(colors, tone)} style={StyleSheet.absoluteFill} />
        ) : null}
      </View>
    </Pressable>
  );
}
