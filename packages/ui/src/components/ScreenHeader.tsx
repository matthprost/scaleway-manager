import { useWindowDimensions, View } from 'react-native';

import { useTheme } from '../theme';
import type { IconName } from './Icon';
import { IconButton } from './IconButton';
import { Text } from './Text';

type ScreenHeaderProps = {
  title: string;
  // Adds a back chevron (a pushed screen)
  onBack?: () => void;
  // One icon button on the right ("Add SSH key"); disabled offline. selected: an on/off action (the pin)
  action?: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; selected?: boolean };
};

// The top of a screen without a purple header: back, the title, and an optional action.
export function ScreenHeader({ title, onBack, action }: ScreenHeaderProps) {
  const { sizes, typography } = useTheme();
  const { fontScale } = useWindowDimensions();

  // The buttons stay next to the title's first line, which is centred on them while it's shorter than 44
  return (
    <View
      testID="screen-header"
      // No gap: the buttons' 44 pt boxes already leave room around their icons
      style={{ minHeight: sizes.touchMin, flexDirection: 'row', alignItems: 'flex-start', gap: 0 }}
    >
      {onBack ? <IconButton icon="chevron-left" label="Back" edge="start" onPress={onBack} /> : null}

      <View
        testID="screen-header-title"
        style={{
          flex: 1,
          paddingVertical: Math.max(0, (sizes.touchMin - typography.title.lineHeight * fontScale) / 2),
        }}
      >
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
      </View>

      {action ? (
        <IconButton
          icon={action.icon}
          label={action.label}
          edge="end"
          disabled={action.disabled}
          selected={action.selected}
          onPress={action.onPress}
        />
      ) : null}
    </View>
  );
}
