import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, TextInput, useWindowDimensions, View } from 'react-native';

import { useTheme } from '../theme';
import { monoFont } from '../tokens';
import { Text } from './Text';

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  // Room for a few lines (a public key)
  multiline?: boolean;
  // The monospace font, without autocorrect (keys)
  monospace?: boolean;
  // Shown under the field in the danger tone, and read out when it appears
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  // While the form is sent: faded, can't be edited
  disabled?: boolean;
  // The person left the field: a check can wait until then rather than run at every keystroke
  onBlur?: () => void;
};

// How many lines of text a multiline field shows before it scrolls
const MULTILINE_LINES = 4;

// A labelled text field: the label above, the error below.
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  monospace = false,
  error,
  autoCapitalize = 'sentences',
  maxLength,
  disabled = false,
  onBlur,
}: TextFieldProps) {
  const { colors, radii, sizes, spacing, typography } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // Android reads the live region itself, so only iOS is told.
    if (error && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(error);
    }
  }, [error]);

  // The field itself is named with the label, so screen readers skip the label above it
  return (
    <View testID="text-field" style={{ gap: spacing.xs, opacity: disabled ? 0.5 : 1 }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text variant="subhead" tone="muted">
          {label}
        </Text>
      </View>

      <View
        testID="text-field-box"
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: error ? colors.alertText : focused ? colors.brand : colors.fieldBorder,
        }}
      >
        <TextInput
          accessibilityLabel={label}
          // The error is heard again whenever someone comes back to the field
          accessibilityHint={error}
          accessibilityState={{ disabled }}
          editable={!disabled}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.brand}
          // Android's own underline would show inside the box
          underlineColorAndroid="transparent"
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          autoCorrect={!monospace}
          spellCheck={!monospace}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={{
            // No line height: on iOS it pushes a one-line field's text off centre
            fontSize: typography.body.fontSize,
            fontWeight: typography.body.fontWeight,
            fontFamily: monospace ? Platform.select(monoFont) : undefined,
            color: colors.text,
            minHeight: multiline
              ? MULTILINE_LINES * typography.body.lineHeight * fontScale + 2 * spacing.sm
              : sizes.touchMin,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        />
      </View>

      {error ? (
        <Text variant="subhead" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
