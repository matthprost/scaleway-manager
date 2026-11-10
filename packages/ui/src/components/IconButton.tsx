import { Pressable } from 'react-native';

import { useTheme } from '../theme';
import { Icon } from './Icon';
import type { IconName } from './Icon';

type IconButtonProps = {
  icon: IconName;
  // Said by screen readers: the button shows no words
  label: string;
  onPress: () => void;
  disabled?: boolean;
  // On the content's edge, the icon sits on that side of its box, so it lines up with the content
  edge?: 'start' | 'end';
  // An on/off action (the pin): brand and heard as selected when on, muted when off. Left out: a plain action
  selected?: boolean;
};

const iconAlign = { start: 'flex-start', end: 'flex-end', center: 'center' } as const;

// An icon alone as a button, in brand like a ghost button, in a 44 × 44 touch box (private to ui).
export function IconButton({ icon, label, onPress, disabled = false, edge, selected }: IconButtonProps) {
  const { sizes } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: sizes.touchMin,
        height: sizes.touchMin,
        alignItems: iconAlign[edge ?? 'center'],
        justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <Icon name={icon} tone={selected === false ? 'muted' : 'brand'} />
    </Pressable>
  );
}
