import type { ApiKeyExpiry, ApiKeysPort } from '@scaleway-manager/core';
import { Button, ListRow, Section, Sheet, Stack, Text, TextField } from '@scaleway-manager/ui';
import { useRef, useState } from 'react';

import { useIsOnline } from '../connectivity/useIsOnline';
import { ActionFailed } from '../errors/ActionFailed';
import { failureWords } from '../errors/failureWords';
import { useSheetVisible } from '../lock/useSheetVisible';
import { useWorkspace } from '../workspace/useWorkspace';
import { NewSecret } from './NewSecret';
import type { CreatedKey } from './NewSecret';

// In the order the sheet lists them
const EXPIRY_LABELS: Record<ApiKeyExpiry, string> = {
  '30d': '30 days',
  '90d': '90 days',
  '1y': '1 year',
  never: 'Never',
};

const DEFAULT_EXPIRY: ApiKeyExpiry = '90d';

type CreateApiKeySheetProps = {
  // The screen wants it open
  visible: boolean;
  onClose: () => void;
  create: ApiKeysPort['create'];
};

// Creates a key for the selected project, then shows its secret once, as the same sheet's second step.
// The secret lives only here (never cached, saved or logged) and is dropped when the sheet closes.
export function CreateApiKeySheet({ visible, onClose, create }: CreateApiKeySheetProps) {
  const { user, project } = useWorkspace();
  const isOnline = useIsOnline();
  const sheet = useSheetVisible(visible);
  const [step, setStep] = useState<'form' | 'secret'>('form');
  const [description, setDescription] = useState('');
  const [expiry, setExpiry] = useState(DEFAULT_EXPIRY);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // The new key and its secret: kept here only, dropped on close
  const [created, setCreated] = useState<CreatedKey | null>(null);
  // The secret is on the clipboard; until then, closing asks first
  const [copied, setCopied] = useState(false);
  const [askingToClose, setAskingToClose] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  // Bumped by each send and by closing: an answer that comes back after the sheet closed is dropped
  const run = useRef(0);
  // A second tap would create a second key
  const busy = useRef(false);

  // Each opening starts with a new form (closing keeps the last step, so it slides away unchanged).
  // However the sheet opened or closed, no secret carries over.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    setCreated(null);
    setAskingToClose(false);
    if (visible) {
      setCopied(false);
      setStep('form');
      setDescription('');
      setExpiry(DEFAULT_EXPIRY);
      setFailure(null);
    }
  }

  const close = () => {
    run.current += 1;
    setCreated(null);
    setAskingToClose(false);
    onClose();
  };

  // A secret nobody copied would be lost for good: closing asks first (asked already, closing again means it)
  const mustAsk = created !== null && !copied;

  const requestClose = () => {
    if (mustAsk && !askingToClose) {
      setAskingToClose(true);
    } else {
      close();
    }
  };

  const send = async () => {
    if (busy.current || user === null || project === null) {
      return;
    }
    busy.current = true;
    run.current += 1;
    const current = run.current;
    setSending(true);
    setFailure(null);
    try {
      const { apiKey, secretKey } = await create({
        userId: user.id,
        description: description.trim(),
        defaultProjectId: project.id,
        expiry,
      });
      if (run.current === current) {
        setCreated({ accessKey: apiKey.accessKey, secretKey });
        setStep('secret');
      }
    } catch (error) {
      if (run.current === current) {
        setFailure(failureWords(error));
      }
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  return (
    <Sheet
      visible={sheet}
      title={step === 'secret' ? 'Copy your secret key now' : 'Create API key'}
      onClose={requestClose}
      holdOpen={mustAsk}
      confirm={
        askingToClose
          ? {
              title: 'Close without copying?',
              message: "You won't see this secret again.",
              confirmLabel: 'Close',
              onConfirm: close,
              onCancel: () => setAskingToClose(false),
            }
          : null
      }
    >
      {step === 'secret' ? (
        <NewSecret created={created} onSecretCopied={() => setCopied(true)} onDone={requestClose} />
      ) : (
        <Stack>
          <TextField
            label="Description"
            value={description}
            placeholder="CI deploy key"
            onChangeText={setDescription}
            disabled={sending}
          />

          <Section title="Expires after">
            {(Object.keys(EXPIRY_LABELS) as ApiKeyExpiry[]).map((choice) => (
              <ListRow
                key={choice}
                title={EXPIRY_LABELS[choice]}
                trailing={{ type: 'check', selected: choice === expiry }}
                disabled={sending}
                onPress={() => setExpiry(choice)}
              />
            ))}
          </Section>

          {project === null ? null : (
            <Text variant="caption" tone="muted">
              {`Default project: ${project.name}`}
            </Text>
          )}

          <Stack gap="xs">
            <Button
              label="Create key"
              size="md"
              loading={sending}
              disabled={!isOnline || user === null || project === null}
              onPress={send}
            />

            {failure === null ? null : <ActionFailed message={failure} />}

            {isOnline ? null : (
              <Text variant="caption" tone="muted" align="center">
                {"You're offline"}
              </Text>
            )}
          </Stack>
        </Stack>
      )}
    </Sheet>
  );
}
