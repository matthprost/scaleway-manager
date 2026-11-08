import { View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

type SectionHeaderProps = {
  title: string;
  // Words only ("See all"): the chevron is added. `chevron: false` for one that stays on the screen ("Back to now").
  action?: { label: string; onPress: () => void; chevron?: boolean };
};

// The title of a part of a screen, with an optional quiet action on the right: "Live resources · See all ›".
export function SectionHeader({ title, action }: SectionHeaderProps) {
  const { sizes, spacing } = useTheme();

  // Centred: a row that mixes text and a button keeps the button its own height
  return (
    <View
      testID="section-header"
      style={{
        minHeight: sizes.touchMin,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        // The ghost button's padding goes into the screen margin, so "See all ›" lines up with the cards
        marginRight: action ? -spacing.md : 0,
      }}
    >
      <View style={{ flexShrink: 1 }}>
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
      </View>

      {action ? (
        <Button
          label={action.label}
          icon={action.chevron === false ? undefined : 'chevron-right'}
          iconPosition="end"
          size="sm"
          variant="ghost"
          onPress={action.onPress}
        />
      ) : null}
    </View>
  );
}
