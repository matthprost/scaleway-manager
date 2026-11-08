import { Button, Card, Overlay, Stack, Text } from '@scaleway-manager/ui';

import { getLockCopy } from './lockCopy';

type EnableLockPromptProps = {
  visible: boolean;
  onAnswer: (enable: boolean) => void;
};

// Asks once, after the first sign-in, whether to lock the app.
export function EnableLockPrompt({ visible, onAnswer }: EnableLockPromptProps) {
  const { promptTitle } = getLockCopy();

  return (
    <Overlay visible={visible} announcement={promptTitle}>
      <Card padding="lg" raised>
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="headline" accessibilityRole="header">
              {promptTitle}
            </Text>

            <Text variant="body" tone="muted">
              Keeps your cloud account safe if someone else picks up your phone.
            </Text>
          </Stack>

          <Stack gap="xs">
            <Button label="Use it" size="md" onPress={() => onAnswer(true)} />

            <Button label="Not now" size="md" variant="secondary" onPress={() => onAnswer(false)} />
          </Stack>
        </Stack>
      </Card>
    </Overlay>
  );
}
