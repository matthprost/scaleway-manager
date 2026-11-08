import { validatePublicKey } from '@scaleway-manager/core';
import { Button, Sheet, Stack, Text, TextField } from '@scaleway-manager/ui';
import { useEffect, useRef, useState } from 'react';

import { useIsOnline } from '../connectivity/useIsOnline';
import { ActionFailed } from '../errors/ActionFailed';
import { failureWords } from '../errors/failureWords';
import { useSheetVisible } from '../lock/useSheetVisible';

const KEY_ERRORS = {
  empty: 'Paste your public key.',
  invalid: "This doesn't look like a public SSH key. It should start with ssh-ed25519, ssh-rsa or ecdsa-sha2.",
};

type AddSshKeySheetProps = {
  // The screen wants it open
  visible: boolean;
  onClose: () => void;
  add: (input: { name: string; publicKey: string }) => Promise<void>;
  // Added on Scaleway: the screen closes the sheet and says so
  onAdded: () => void;
};

// A name and a public key, added to the selected project. The form's state lives here, above the Sheet.
export function AddSshKeySheet({ visible, onClose, add, onAdded }: AddSshKeySheetProps) {
  const isOnline = useIsOnline();
  const sheet = useSheetVisible(visible);
  const [name, setName] = useState('');
  const [publicKey, setPublicKey] = useState('');
  // The key is checked once the person leaves its field or pastes into it, never while they type
  const [keyChecked, setKeyChecked] = useState(false);
  // Something was typed or pasted: passing through the field untouched says nothing
  const [keyTouched, setKeyTouched] = useState(false);
  const [sending, setSending] = useState(false);
  // Why it wasn't added: shown under the button
  const [failure, setFailure] = useState<string | null>(null);
  // A second tap would send the key twice
  const busy = useRef(false);
  // The answer for a sheet that was closed closes nothing (a new form may be open by then)
  const open = useRef(visible);
  const check = validatePublicKey(publicKey);
  const keyError = keyChecked && check !== 'ok' ? KEY_ERRORS[check] : undefined;
  const ready = name.trim() !== '' && check === 'ok';

  useEffect(() => {
    open.current = visible;

    return () => {
      open.current = false;
    };
  }, [visible]);

  const send = async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setSending(true);
    setFailure(null);
    try {
      await add({ name: name.trim(), publicKey: publicKey.trim() });
      if (open.current) {
        onAdded();
      }
    } catch (error) {
      setFailure(failureWords(error));
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  return (
    <Sheet visible={sheet} title="Add SSH key" onClose={onClose}>
      <Stack>
        <TextField label="Name" value={name} placeholder="My laptop" onChangeText={setName} disabled={sending} />

        <TextField
          label="Public key"
          value={publicKey}
          placeholder="ssh-ed25519 AAAA… you@example.com"
          onChangeText={(text) => {
            // Many characters at once (a paste, a cut) is a finished key; one at a time is typing
            setKeyChecked(Math.abs(text.length - publicKey.length) > 1);
            setKeyTouched(true);
            setPublicKey(text);
          }}
          onBlur={() => setKeyChecked(keyTouched)}
          multiline
          monospace
          autoCapitalize="none"
          error={keyError}
          disabled={sending}
        />

        <Stack gap="xs">
          <Button label="Add key" size="md" disabled={!ready || !isOnline} loading={sending} onPress={send} />

          {failure === null ? null : <ActionFailed message={failure} />}

          {isOnline ? null : (
            <Text variant="caption" tone="muted" align="center">
              {"You're offline"}
            </Text>
          )}
        </Stack>
      </Stack>
    </Sheet>
  );
}
