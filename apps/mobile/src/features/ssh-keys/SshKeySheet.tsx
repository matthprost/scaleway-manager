import { ListRow, Section, Sheet, Stack, Text } from '@scaleway-manager/ui';
import { useRef, useState } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { useIsOnline } from '../connectivity/useIsOnline';
import { ActionFailed } from '../errors/ActionFailed';
import { failureWords } from '../errors/failureWords';
import { useSheetVisible } from '../lock/useSheetVisible';
import type { SshKeyItem } from './useSshKeys';

type SshKeySheetProps = {
  sshKey: SshKeyItem;
  // The screen wants it open
  visible: boolean;
  onClose: () => void;
  remove: (id: string) => Promise<void>;
  // Gone from Scaleway: the screen closes the sheet and says so
  onDeleted: () => void;
};

// One key: its name, fingerprint (to copy), date and whether it's disabled. Deleting asks first, as this sheet's
// second step.
export function SshKeySheet({ sshKey, visible, onClose, remove, onDeleted }: SshKeySheetProps) {
  const { clipboard } = useServices();
  const isOnline = useIsOnline();
  const sheet = useSheetVisible(visible);
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Why it wasn't deleted: shown under Delete key
  const [failure, setFailure] = useState<string | null>(null);
  // A second tap would delete twice (the second one fails: "This doesn't exist anymore.")
  const busy = useRef(false);

  // Offline, the question goes away (Delete key says why), unless it's already running
  if (asking && !isOnline && !deleting) {
    setAsking(false);
  }

  const confirmDelete = async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setDeleting(true);
    try {
      await remove(sshKey.id);
      onDeleted();
    } catch (error) {
      // Back to the key, with the reason under Delete key
      setAsking(false);
      setFailure(failureWords(error));
    } finally {
      busy.current = false;
      setDeleting(false);
    }
  };

  return (
    <Sheet
      visible={sheet}
      title={sshKey.name}
      onClose={onClose}
      confirm={
        asking
          ? {
              title: `Delete ${sshKey.name}?`,
              message: "Servers created after this won't accept this key. Servers that already have it keep it.",
              confirmLabel: 'Delete',
              busy: deleting,
              onConfirm: confirmDelete,
              onCancel: () => setAsking(false),
            }
          : null
      }
    >
      <Stack>
        <Stack gap="xs">
          <Section>
            <ListRow title="Name" trailing={{ type: 'text', text: sshKey.name }} />

            <ListRow
              title="Fingerprint"
              trailing={{ type: 'text', text: sshKey.fingerprint, onCopy: (text, options) => clipboard.copy(text, options) }}
            />

            <ListRow title="Added" trailing={{ type: 'text', text: sshKey.added }} />

            {sshKey.disabled ? <ListRow title="Status" trailing={{ type: 'text', text: 'Disabled' }} /> : null}
          </Section>

          {sshKey.disabled ? (
            <Text variant="caption" tone="muted">
              {"New servers won't get this key. Servers that already have it keep it."}
            </Text>
          ) : null}
        </Stack>

        <Stack gap="xs">
          <Section>
            <ListRow
              title="Delete key"
              subtitle={isOnline ? undefined : "You're offline"}
              icon="trash"
              destructive
              disabled={!isOnline}
              onPress={() => {
                setFailure(null);
                setAsking(true);
              }}
            />
          </Section>

          {failure === null ? null : <ActionFailed message={failure} />}
        </Stack>
      </Stack>
    </Sheet>
  );
}
