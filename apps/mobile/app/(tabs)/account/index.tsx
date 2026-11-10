import {
  Card,
  ListRow,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  Stack,
  Text,
} from '@scaleway-manager/ui';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';

import { APPEARANCE_LABELS, AppearanceSheet } from '../../../src/features/account/AppearanceSheet';
import { openRepository } from '../../../src/features/account/openRepository';
import { useAppearance } from '../../../src/features/appearance/AppearanceProvider';
import { useIsOnline } from '../../../src/features/connectivity/useIsOnline';
import { ActionFailed } from '../../../src/features/errors/ActionFailed';
import { LoadFailed } from '../../../src/features/errors/LoadFailed';
import { getLockCopy } from '../../../src/features/lock/lockCopy';
import { useLockSetting } from '../../../src/features/lock/useLockSetting';
import { ProjectPickerSheet } from '../../../src/features/workspace/ProjectPickerSheet';
import { useSwitchOrganization } from '../../../src/features/workspace/useSwitchOrganization';
import { useWorkspace } from '../../../src/features/workspace/useWorkspace';
import { useServices, useSwitchMode } from '../../../src/wiring/ServicesProvider';

export default function Account() {
  const { mode, keeper } = useServices();
  const switchMode = useSwitchMode();
  const router = useRouter();
  const isOnline = useIsOnline();
  const { status, user, organization, project, retry } = useWorkspace();
  const appearance = useAppearance();
  const lock = useLockSetting();
  const switching = useSwitchOrganization();
  // One sheet at a time: each opens from this screen only
  const [sheet, setSheet] = useState<'project' | 'appearance' | null>(null);
  // The action that failed: its quiet line shows under it
  const [failed, setFailed] = useState<'leave' | 'github' | null>(null);
  const version = Constants.expoConfig?.version;

  const leaving = useRef(false);

  // Signing out is enough: the app goes back to Welcome and the root layout wipes the saved data.
  // Ignores taps while leaving; on failure the user stays here.
  const leave = async () => {
    if (leaving.current) {
      return;
    }
    leaving.current = true;
    setFailed(null);
    try {
      await (mode === 'demo' ? switchMode('real') : keeper.signOut());
    } catch {
      setFailed('leave');
    } finally {
      leaving.current = false;
    }
  };

  const openGitHub = async () => {
    setFailed(null);
    try {
      await openRepository();
    } catch {
      setFailed('github');
    }
  };

  return (
    <Screen topInset="belowNotice">
      <Stack>
        <ScreenHeader title="Account" />

        <Card>
          {user !== null ? (
            <Stack gap="xxs">
              <Text variant="headline">{user.email}</Text>

              {organization !== null ? (
                <Text variant="body" tone="muted">
                  {organization.name}
                </Text>
              ) : null}
            </Stack>
          ) : status === 'error' ? (
            <LoadFailed title="Couldn't load your account" onRetry={retry} />
          ) : (
            <Stack gap="xxs">
              <Skeleton width="100%" variant="headline" />

              <Skeleton width="100%" />
            </Stack>
          )}
        </Card>

        <Stack gap="xs">
          <Section title="Workspace">
            <ListRow
              title="Project"
              trailing={{ type: 'chevron', text: project?.name }}
              onPress={() => setSheet('project')}
            />

            {mode === 'demo' ? null : (
              <ListRow
                title="Switch organization"
                subtitle={isOnline ? undefined : "You're offline"}
                trailing={{ type: 'chevron' }}
                disabled={!isOnline}
                loading={switching.busy}
                onPress={() => switching.start()}
              />
            )}
          </Section>

          {switching.failed ? <ActionFailed /> : null}
        </Stack>

        <Section title="Access">
          <ListRow
            title="SSH keys"
            icon="key"
            trailing={{ type: 'chevron' }}
            onPress={() => router.push('/account/ssh-keys')}
          />

          <ListRow
            title="API keys"
            icon="key"
            trailing={{ type: 'chevron' }}
            onPress={() => router.push('/account/api-keys')}
          />

          <ListRow
            title="Activity"
            icon="activity"
            trailing={{ type: 'chevron' }}
            onPress={() => router.push('/account/activity')}
          />
        </Section>

        <Stack gap="xs">
          <Section title="Security and display">
            {lock.shown ? (
              <ListRow
                title={getLockCopy().rowTitle}
                icon="fingerprint"
                trailing={{ type: 'switch', value: lock.on, onValueChange: lock.change }}
              />
            ) : null}

            <ListRow
              title="Appearance"
              icon="appearance"
              trailing={{ type: 'chevron', text: APPEARANCE_LABELS[appearance] }}
              onPress={() => setSheet('appearance')}
            />
          </Section>

          {lock.failed ? <ActionFailed /> : null}
        </Stack>

        <Stack gap="xs">
          <Section title="About">
            <ListRow
              title="About Scaleway Manager"
              icon="info"
              trailing={{ type: 'chevron' }}
              onPress={() => router.push('/account/about')}
            />

            <ListRow title="Source code on GitHub" icon="github" trailing={{ type: 'external' }} onPress={openGitHub} />
          </Section>

          {failed === 'github' ? <ActionFailed /> : null}
        </Stack>

        <Stack gap="xs">
          <Section>
            <ListRow title={mode === 'demo' ? 'Exit demo' : 'Log out'} icon="log-out" destructive onPress={leave} />
          </Section>

          {failed === 'leave' ? <ActionFailed /> : null}
        </Stack>

        {version === undefined ? null : (
          <Text variant="caption" tone="muted" align="center">
            {`Version ${version}`}
          </Text>
        )}
      </Stack>

      <ProjectPickerSheet visible={sheet === 'project'} onClose={() => setSheet(null)} />

      <AppearanceSheet visible={sheet === 'appearance'} onClose={() => setSheet(null)} />

    </Screen>
  );
}
