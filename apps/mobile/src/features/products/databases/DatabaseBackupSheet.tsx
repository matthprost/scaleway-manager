import type { DatabaseAction } from '@scaleway-manager/core';
import { Button, Card, EmptyState, ListRow, Section, Sheet, Stack, Text, TextField } from '@scaleway-manager/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useServices } from '../../../wiring/ServicesProvider';
import { ActionFailed } from '../../errors/ActionFailed';
import { LoadFailed } from '../../errors/LoadFailed';
import { isRefused } from '../../errors/queryFailure';
import { useSheetVisible } from '../../lock/useSheetVisible';
import { resourceKey } from '../../resources/products';
import type { ResourceAction } from '../../resources/useResourceAction';

// How long Scaleway keeps a backup taken from the phone
const KEPT_FOR = 30 * 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, '0');

type DatabaseBackupSheetProps = {
  // The database's name, in the title: "Back up db-main"
  dbName: string;
  region: string;
  id: string;
  // The screen wants it open
  visible: boolean;
  onClose: () => void;
  // Scaleway took it: the screen closes the sheet (before the toast, which shows under a sheet) and follows the backup
  onSent: () => void;
  // The screen's actions: one at a time, refused offline, never kept for later
  action: ResourceAction<DatabaseAction>;
};

// Names a backup of one of the instance's databases, then takes it. The name follows the picked database
// ("app-2026-11-07-1405") until it's edited; the sheet closes once it's sent, and stays open if it fails.
export function DatabaseBackupSheet({
  dbName,
  region,
  id,
  visible,
  onClose,
  onSent,
  action,
}: DatabaseBackupSheetProps) {
  const { clock, databases } = useServices();
  const sheet = useSheetVisible(visible);
  const names = useQuery({
    queryKey: [...resourceKey('databases', region, id), 'databases'],
    queryFn: () => databases.databaseNames(region, id),
    enabled: visible,
  });
  // Nothing to pick from: Scaleway refused them (403), they failed, or they wait for the network with nothing saved
  const namesRefused = names.data === undefined && isRefused(names.error);
  const namesFailed = names.data === undefined && !namesRefused && (names.isError || names.fetchStatus === 'paused');
  // When it opened: the default name's date and time, on the phone's clock
  const [openedAt, setOpenedAt] = useState(() => clock.now());
  // null: the first database
  const [picked, setPicked] = useState<string | null>(null);
  // null: the name follows the picked database
  const [edited, setEdited] = useState<string | null>(null);
  // Sent since it opened: an older failure isn't this one's
  const [sent, setSent] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);

  // Each opening starts again from the defaults (closing keeps the form, so it slides away unchanged)
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setOpenedAt(clock.now());
      setPicked(null);
      setEdited(null);
      setSent(false);
    }
  }

  const choices = names.data ?? [];
  const database = picked !== null && choices.includes(picked) ? picked : choices[0];
  // "2026-11-07-1405"
  const stamp = [
    openedAt.getFullYear(),
    pad(openedAt.getMonth() + 1),
    pad(openedAt.getDate()),
    `${pad(openedAt.getHours())}${pad(openedAt.getMinutes())}`,
  ].join('-');
  const name = edited ?? (database === undefined ? '' : `${database}-${stamp}`);
  const sending = action.running === 'backup';

  const send = () => {
    if (database === undefined) {
      return;
    }
    setSent(true);
    action.run({
      key: 'backup',
      toast: 'Backup started',
      // A backup leaves the database's status as it is: nothing to follow
      poll: false,
      perform: async () => {
        await databases.backup(region, id, {
          databaseName: database,
          name: name.trim(),
          expiresAt: new Date(clock.now().getTime() + KEPT_FOR).toISOString(),
        });
        onSent();
      },
    });
  };

  return (
    <Sheet visible={sheet} title={`Back up ${dbName}`} onClose={onClose}>
      <Stack>
        {names.data !== undefined ? (
          choices.length === 0 ? (
            <Text variant="caption" tone="muted">
              No databases to back up.
            </Text>
          ) : (
            <Section title="Database">
              {choices.map((choice) => (
                <ListRow
                  key={choice}
                  title={choice}
                  trailing={{ type: 'check', selected: choice === database }}
                  disabled={sending}
                  onPress={() => setPicked(choice)}
                />
              ))}
            </Section>
          )
        ) : namesRefused ? (
          <EmptyState
            icon="database"
            title="Backups aren't available"
            message="You don't have access to backups in this project."
          />
        ) : namesFailed ? (
          <Card>
            <LoadFailed
              title="Couldn't load your databases"
              onRetry={() => void names.refetch()}
              // Back up's caption says "You're offline"
              offlineSaidAbove
            />
          </Card>
        ) : (
          <Section title="Database" loading />
        )}

        <TextField
          label="Backup name"
          value={name}
          onChangeText={setEdited}
          autoCapitalize="none"
          disabled={sending}
        />

        <Text variant="caption" tone="muted">
          Kept for 30 days.
        </Text>

        <Stack gap="xs">
          <Button
            label="Back up"
            size="md"
            loading={sending}
            disabled={action.disabledReason !== undefined || database === undefined || name.trim() === ''}
            onPress={send}
          />

          {sent && action.failure?.key === 'backup' ? <ActionFailed message={action.failure.message} /> : null}

          {action.disabledReason === undefined ? null : (
            <Text variant="caption" tone="muted" align="center">
              {action.disabledReason}
            </Text>
          )}
        </Stack>
      </Stack>
    </Sheet>
  );
}
