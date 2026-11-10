import { Pressable, View } from 'react-native';

import { useTheme } from '../theme';
import { sizes, spacing, typography } from '../tokens';
import { Icon } from './Icon';
import { Text } from './Text';

type PickerChipProps = {
  label: string;
  onPress: () => void;
};

// How tall the chip is at a text size, while its label fits one line: its 44 pt touch box, or its padding and line.
export function pickerChipHeight(fontScale: number): number {
  return Math.max(
    sizes.touchMin,
    sizes.touchMin - sizes.compactControl + 2 * spacing.xxs + typography.subhead.lineHeight * fontScale,
  );
}

// A see-through white chip on the header that opens a picker: "Acme · Production ▾".
export function PickerChip({ label, onPress }: PickerChipProps) {
  const { colors, radii, sizes, spacing } = useTheme();

  // A 44 pt touch box with the chip in its middle, like a small Button, so it matches a SegmentedControl beside it
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchMin,
        paddingVertical: (sizes.touchMin - sizes.compactControl) / 2,
        alignItems: 'flex-start',
        // In a row, a long name wraps instead of pushing the switch off the screen
        flexShrink: 1,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        testID="picker-chip"
        style={{
          flexGrow: 1,
          minHeight: sizes.compactControl,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xxs,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radii.pill,
          backgroundColor: colors.controlOnBrand,
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <Text variant="subhead" tone="onBrand">
            {label}
          </Text>
        </View>

        <Icon name="chevron-down" size="sm" tone="onBrand" />
      </View>
    </Pressable>
  );
}
