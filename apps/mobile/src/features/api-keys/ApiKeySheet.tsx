import { formatDay } from '@scaleway-manager/core';
import type { ApiKey } from '@scaleway-manager/core';
import { ListRow, Section, Sheet, Stack, Text } from '@scaleway-manager/ui';
import { useRef, useState } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { useIsOnline } from '../connectivity/useIsOnline';
import { ActionFailed } from '../errors/ActionFailed';
import { failureWords } from '../errors/failureWords';
import { useSheetVisible } from '../lock/useSheetVisible';
import { apiKeyName, hasExpired } from './useApiKeys';

type ApiKeySheetProps = {
  apiKey: ApiKey;
  // The screen wants it open
  visible: boolean;
  onClose: () => void;
  remove: (accessKey: string) => Promise<void>;
  // Gone from Scaleway: the screen closes the sheet and says so
  onDeleted: () => void;
};

// A key's details. Deleting asks first, as this sheet's second step; some keys Scaleway won't let anyone delete.
export function ApiKeySheet({ apiKey, visible, onClose, remove, onDeleted }: ApiKeySheetProps) {
  const { clipboard, clock } = useServices();
  const isOnline = useIsOnline();
  const sheet = useSheetVisible(visible);
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // A delete that failed: its quiet line shows under the button
  const [failure, setFailure] = useState<string | null>(null);
  const busy = useRef(false);
  // The question names the key: its description, or its access key when it has none
  const deletedName = apiKey.description.trim() === '' ? apiKey.accessKey : apiKey.description;

  // Offline, the question goes away (the row says why)
  if (asking && !isOnline && !deleting) {
    setAsking(false);
  }

  const close = () => {
    setAsking(false);
    setFailure(null);
    onClose();
  };

  const confirmDelete = async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setDeleting(true);
    try {
      await remove(apiKey.accessKey);
      setAsking(false);
      onDeleted();
    } catch (error) {
      // Back to the key, with the quiet line
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
      title={apiKeyName(apiKey)}
      onClose={close}
      confirm={
        asking
          ? {
              title: `Delete ${deletedName}?`,
              message: 'Anything using it will stop working right away.',
              confirmLabel: 'Delete',
              busy: deleting,
              onConfirm: confirmDelete,
              onCancel: () => setAsking(false),
            }
          : null
      }
    >
      <Stack>
        <Section>
          <ListRow
            title="Access key"
            trailing={{
              type: 'text',
              text: apiKey.accessKey,
              onCopy: (text, options) => clipboard.copy(text, options),
            }}
          />

          <ListRow title="Created" trailing={{ type: 'text', text: formatDay(new Date(apiKey.createdAt)) }} />

          <ListRow
            title={hasExpired(apiKey, clock.now()) ? 'Expired' : 'Expires'}
            trailing={{
              type: 'text',
              text: apiKey.expiresAt === null ? 'Never' : formatDay(new Date(apiKey.expiresAt)),
            }}
          />
        </Section>

        {apiKey.deletable ? (
          <Stack gap="xs">
            <Section>
              <ListRow
                title="Delete key"
                icon="trash"
                subtitle={isOnline ? undefined : "You're offline"}
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
        ) : (
          <Text variant="caption" tone="muted">
            {"Scaleway doesn't allow deleting this key."}
          </Text>
        )}
      </Stack>
    </Sheet>
  );
}
