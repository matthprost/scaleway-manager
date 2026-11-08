import { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { COPIED, confirmCopy } from './copied';
import type { CopyHandler } from './copied';
import { Text } from './Text';

type SecretBoxProps = {
  label: string;
  value: string;
  // The screen passes both on to its clipboard and returns its promise: `sensitive` hides a secret from
  // Android's clipboard preview
  onCopy: CopyHandler<{ sensitive: true }>;
  // While the app is in the app switcher or the background: dots, and Copy is off
  hidden?: boolean;
};

// Always the same length, so it says nothing about the secret
const DOTS = '••••••••••••••••';

// A secret shown once (a new API key): its label, a Copy button, and the value in a highlighted box.
export function SecretBox({ label, value, onCopy, hidden = false }: SecretBoxProps) {
  const { colors, radii, sizes, spacing } = useTheme();
  // The value last copied: a new value starts again at Copy
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const action = copiedValue === value ? COPIED : 'Copy';

  // A row that mixes text and a button centres them, so the button keeps its own height
  return (
    <View style={{ gap: spacing.xs }}>
      <View
        style={{
          minHeight: sizes.touchMin,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <Text variant="subhead" tone="muted">
            {label}
          </Text>
        </View>

        <Button
          label={action}
          accessibilityLabel={`${action} ${label}`}
          icon={copiedValue === value ? 'check' : 'copy'}
          size="sm"
          variant="secondary"
          disabled={hidden}
          onPress={() => confirmCopy(onCopy(value, { sensitive: true }), () => setCopiedValue(value))}
        />
      </View>

      {/* One element whose name never holds the value: a secret is never read out, in public, character by character */}
      <View
        testID="secret-box"
        accessible
        accessibilityLabel={hidden ? 'Hidden' : 'Hidden. Use Copy to paste it.'}
        style={{ backgroundColor: colors.highlightBackground, borderRadius: radii.md, padding: spacing.md }}
      >
        <Text variant="body" mono>
          {hidden ? DOTS : value}
        </Text>
      </View>
    </View>
  );
}
