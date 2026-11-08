import { EmptyState, ListRow, Screen, ScreenHeader, Section, Stack, Text } from '@scaleway-manager/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useIsOnline } from '../../../src/features/connectivity/useIsOnline';
import { LoadFailed } from '../../../src/features/errors/LoadFailed';
import { useToast } from '../../../src/features/feedback/useToast';
import { AddSshKeySheet } from '../../../src/features/ssh-keys/AddSshKeySheet';
import { SshKeySheet } from '../../../src/features/ssh-keys/SshKeySheet';
import { useSshKeys } from '../../../src/features/ssh-keys/useSshKeys';
import type { SshKeyItem } from '../../../src/features/ssh-keys/useSshKeys';

// The selected project's SSH keys: add one, look at one, delete one.
export default function SshKeys() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const toast = useToast();
  const { project, keys, error, retry, add, remove } = useSshKeys();
  // One sheet at a time, each opened from this screen only
  const [opened, setOpened] = useState<'add' | 'key' | null>(null);
  // The key in its sheet, kept while the sheet slides away
  const [selected, setSelected] = useState<SshKeyItem | null>(null);
  // Goes up each time a sheet opens, so each opening starts fresh (an empty form, no old failure)
  const [round, setRound] = useState(0);
  // Adding needs the network, and a project to add to
  const canAdd = isOnline && project !== null;
  // An empty or failed list says "You're offline" under its own button, so the header doesn't say it too
  const contentSaysOffline = error === null ? keys?.length === 0 : error.kind !== 'forbidden';

  const openAdd = () => {
    setRound((current) => current + 1);
    setOpened('add');
  };

  // Toasts once the sheet is closing, for a success that is out of sight under it
  const closeThenSay = (sheet: 'add' | 'key', message: string) => {
    setOpened((current) => (current === sheet ? null : current));
    toast(message);
  };

  return (
    <Screen topInset="belowNotice">
      <Stack>
        <Stack gap="xxs">
          <ScreenHeader
            title="SSH keys"
            onBack={router.back}
            action={{ icon: 'plus', label: 'Add SSH key', onPress: openAdd, disabled: !canAdd }}
          />

          {isOnline || contentSaysOffline ? null : (
            <Text variant="caption" tone="muted" align="end">
              {"You're offline"}
            </Text>
          )}
        </Stack>

        {error?.kind === 'forbidden' ? (
          <EmptyState
            icon="key"
            title="SSH keys aren't available"
            message="You don't have access to SSH keys in this project."
          />
        ) : error !== null ? (
          <LoadFailed title="Couldn't load your SSH keys" onRetry={retry} />
        ) : keys === undefined ? (
          <Section loading />
        ) : keys.length === 0 ? (
          <EmptyState
            icon="key"
            title="No SSH keys in this project"
            action={{
              label: 'Add SSH key',
              onPress: openAdd,
              disabled: !canAdd,
              note: isOnline ? undefined : "You're offline",
            }}
          />
        ) : (
          <Section title={project?.name}>
            {keys.map((key) => (
              <ListRow
                key={key.id}
                title={key.name}
                subtitle={key.summary}
                trailing={{ type: 'text', text: key.added }}
                onPress={() => {
                  setSelected(key);
                  setRound((current) => current + 1);
                  setOpened('key');
                }}
              />
            ))}
          </Section>
        )}
      </Stack>

      <AddSshKeySheet
        key={`add-${round}`}
        visible={opened === 'add'}
        onClose={() => setOpened(null)}
        add={add}
        onAdded={() => closeThenSay('add', 'SSH key added')}
      />

      {selected === null ? null : (
        <SshKeySheet
          key={`key-${round}`}
          sshKey={selected}
          visible={opened === 'key'}
          onClose={() => setOpened(null)}
          remove={remove}
          onDeleted={() => closeThenSay('key', 'SSH key deleted')}
        />
      )}
    </Screen>
  );
}
