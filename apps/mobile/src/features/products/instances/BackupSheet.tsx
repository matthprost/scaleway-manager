import { Button, Sheet, Stack, Text, TextField } from '@scaleway-manager/ui';
import { useState } from 'react';

import { useServices } from '../../../wiring/ServicesProvider';
import { ActionFailed } from '../../errors/ActionFailed';
import { useSheetVisible } from '../../lock/useSheetVisible';

type BackupSheetProps = {
  serverName: string;
  // The screen wants it open
  visible: boolean;
  onClose: () => void;
  // Sends the backup under this name (the screen closes the sheet once it's sent)
  onBackUp: (name: string) => void;
  // While it's sent: the button spins and the name can't be edited
  sending: boolean;
  // The button is off, and this says why under it ("You're offline")
  disabledReason: string | undefined;
  // Why it didn't work, under the button
  failure: string | null;
};

// Names a backup of every disk of the server. The name's state lives here, above the Sheet.
export function BackupSheet({
  serverName,
  visible,
  onClose,
  onBackUp,
  sending,
  disabledReason,
  failure,
}: BackupSheetProps) {
  const { clock } = useServices();
  const sheet = useSheetVisible(visible);
  // "web-prod-1-2026-11-07", the phone's date
  const [name, setName] = useState(() => {
    const today = clock.now();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${serverName}-${today.getFullYear()}-${month}-${day}`;
  });

  return (
    <Sheet visible={sheet} title={`Back up ${serverName}`} onClose={onClose}>
      <Stack>
        <Stack gap="xs">
          <TextField
            label="Backup name"
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
            disabled={sending}
          />

          <Text variant="caption" tone="muted">
            {"A backup copies this server's disks, except scratch disks. It's billed as storage."}
          </Text>
        </Stack>

        <Stack gap="xs">
          <Button
            label="Back up"
            size="md"
            disabled={name.trim() === '' || disabledReason !== undefined}
            loading={sending}
            onPress={() => onBackUp(name.trim())}
          />

          {failure === null ? null : <ActionFailed message={failure} />}

          {disabledReason === undefined ? null : (
            <Text variant="caption" tone="muted" align="center">
              {disabledReason}
            </Text>
          )}
        </Stack>
      </Stack>
    </Sheet>
  );
}
