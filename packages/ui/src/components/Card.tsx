import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme';
import type { spacing as spacingTokens } from '../tokens';

type CardProps = {
  children: ReactNode;
  padding?: keyof typeof spacingTokens;
  raised?: boolean;
  onPress?: () => void;
  // With onPress: faded and can't be pressed
  disabled?: boolean;
  // With onPress: what screen readers say for the whole card (by default, its text)
  accessibilityLabel?: string;
  // With onPress: what happens when it's pressed, if it isn't obvious ("Opens in your browser")
  accessibilityHint?: string;
  // Fills the free space its parent gives it (flex: 1): a card in a Carousel is as tall as the tallest
  grow?: boolean;
};

export function Card({
  children,
  padding = 'md',
  raised = false,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  grow = false,
}: CardProps) {
  const { colors, radii, spacing, scheme } = useTheme();
  const style = {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[padding],
    flexGrow: grow ? 1 : undefined,
    ...(raised && scheme === 'light'
      ? {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 3,
        }
      : {}),
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({ ...style, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={style}>{children}</View>;
}
