import { formatDay } from '@scaleway-manager/core';
import type { ApiKey } from '@scaleway-manager/core';
import { EmptyState, ListRow, Screen, ScreenHeader, Section, Stack, Text } from '@scaleway-manager/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ApiKeySheet } from '../../../src/features/api-keys/ApiKeySheet';
import { CreateApiKeySheet } from '../../../src/features/api-keys/CreateApiKeySheet';
import { apiKeyName, hasExpired, useApiKeys } from '../../../src/features/api-keys/useApiKeys';
import { useIsOnline } from '../../../src/features/connectivity/useIsOnline';
import { LoadFailed } from '../../../src/features/errors/LoadFailed';
import { useToast } from '../../../src/features/feedback/useToast';
import { useServices } from '../../../src/wiring/ServicesProvider';

// The current user's API keys: create one (its secret shows once), see one, delete one.
export default function ApiKeys() {
  const router = useRouter();
  const { clock } = useServices();
  const isOnline = useIsOnline();
  const toast = useToast();
  const { keys, error, retry, create, remove } = useApiKeys();
  // An empty or failed list says "You're offline" under its own button, so the header doesn't say it too
  const contentSaysOffline = error === null ? keys?.length === 0 : error.kind !== 'forbidden';
  // One sheet at a time: each opens from this screen only
  const [sheet, setSheet] = useState<'create' | 'key' | null>(null);
  // The key whose sheet is open; kept while it slides away
  const [picked, setPicked] = useState<ApiKey | null>(null);

  const openCreate = () => setSheet('create');

  return (
    <Screen topInset="belowNotice">
      <Stack>
        <Stack gap="xxs">
          <ScreenHeader
            title="API keys"
            onBack={router.back}
            action={{ icon: 'plus', label: 'Create API key', onPress: openCreate, disabled: !isOnline }}
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
            title="API keys aren't available"
            message="You don't have access to API keys in this organization."
          />
        ) : error !== null ? (
          <LoadFailed title="Couldn't load your API keys" onRetry={retry} />
        ) : keys === undefined ? (
          <Section loading />
        ) : keys.length === 0 ? (
          <EmptyState
            icon="key"
            title="No API keys"
            action={{
              label: 'Create API key',
              onPress: openCreate,
              disabled: !isOnline,
              note: isOnline ? undefined : "You're offline",
            }}
          />
        ) : (
          <Section>
            {keys.map((key) => (
              <ListRow
                key={key.accessKey}
                title={apiKeyName(key)}
                subtitle={key.accessKey}
                trailing={{
                  type: 'text',
                  text:
                    key.expiresAt === null
                      ? 'Never expires'
                      : `${hasExpired(key, clock.now()) ? 'Expired' : 'Expires'} ${formatDay(new Date(key.expiresAt))}`,
                }}
                onPress={() => {
                  setPicked(key);
                  setSheet('key');
                }}
              />
            ))}
          </Section>
        )}
      </Stack>

      <CreateApiKeySheet visible={sheet === 'create'} onClose={() => setSheet(null)} create={create} />

      {picked === null ? null : (
        <ApiKeySheet
          apiKey={picked}
          visible={sheet === 'key'}
          onClose={() => setSheet(null)}
          remove={remove}
          onDeleted={() => {
            setSheet(null);
            toast('API key deleted');
          }}
        />
      )}
    </Screen>
  );
}
