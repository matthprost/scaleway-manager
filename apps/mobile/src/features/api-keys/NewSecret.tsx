import { Button, SecretBox, Stack, Text } from '@scaleway-manager/ui';
import { useEffect } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { useAppActive } from '../appState/useAppActive';
import { useLockState } from '../lock/LockProvider';

export type CreatedKey = { accessKey: string; secretKey: string };

type NewSecretProps = {
  // null once the sheet has dropped it (it may still be sliding away)
  created: CreatedKey | null;
  // The secret is on the clipboard: closing needn't ask any more
  onSecretCopied: () => void;
  onDone: () => void;
};

// The new key's second step: its secret, shown once to copy now. Dots while the app is away, so the phone's
// snapshot of the app never shows it.
export function NewSecret({ created, onSecretCopied, onDone }: NewSecretProps) {
  const { clipboard, screenPrivacy } = useServices();
  const { lockOn } = useLockState();
  const appActive = useAppActive();
  const shown = created !== null;
  const hidden = !appActive || !shown;

  // Android: no screenshot or app switcher snapshot while the secret is on screen. With the Face ID lock on the
  // screen is kept private anyway, so it stays so after.
  useEffect(() => {
    if (!shown) {
      return;
    }
    void screenPrivacy.protect().catch(() => {
      // The dots still cover the app switcher
    });

    return () => {
      if (!lockOn) {
        void screenPrivacy.allow().catch(() => {
          // Nothing more to do
        });
      }
    };
  }, [shown, lockOn, screenPrivacy]);

  return (
    <Stack>
      <Text variant="body">{"You won't be able to see it again."}</Text>

      <SecretBox
        label="Access key"
        value={created?.accessKey ?? ''}
        onCopy={(text, options) => clipboard.copy(text, options)}
        hidden={hidden}
      />

      <SecretBox
        label="Secret key"
        value={created?.secretKey ?? ''}
        onCopy={(text, options) => clipboard.copy(text, options).then(onSecretCopied)}
        hidden={hidden}
      />

      <Button label="Done" size="md" onPress={onDone} />
    </Stack>
  );
}
