import { ListRow, Section, Sheet, Stack } from '@scaleway-manager/ui';
import { useState } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { useIsOnline } from '../connectivity/useIsOnline';
import { ActionFailed } from '../errors/ActionFailed';
import { LoadFailed } from '../errors/LoadFailed';
import { useSheetVisible } from '../lock/useSheetVisible';
import { useSwitchOrganization } from './useSwitchOrganization';
import { useWorkspace } from './useWorkspace';

type ProjectPickerSheetProps = {
  // The screen wants it open
  visible: boolean;
  onClose: () => void;
};

// Picks the project, or opens Scaleway's page to switch organization (not in demo); the sheet closes once it switched.
export function ProjectPickerSheet({ visible, onClose }: ProjectPickerSheetProps) {
  const { mode } = useServices();
  const { status, organization, projects, project, setProject, retry } = useWorkspace();
  const switching = useSwitchOrganization();
  const isOnline = useIsOnline();
  const sheet = useSheetVisible(visible);
  // A project that couldn't be saved: its quiet line shows under the projects
  const [failed, setFailed] = useState(false);
  const loading = status === 'loading';
  // The demo has no Switch organization: its section only holds the name, so it goes when there is none
  const showOrganization = mode !== 'demo' || organization !== null || loading;
  // Only the name waits: Switch organization is there at once
  const nameLoading = organization === null && loading;

  const close = () => {
    switching.reset();
    setFailed(false);
    onClose();
  };

  const choose = async (id: string) => {
    switching.reset();
    setFailed(false);
    try {
      await setProject(id);
      close();
    } catch {
      setFailed(true);
    }
  };

  return (
    <Sheet
      visible={sheet}
      title="Organization and project"
      onClose={close}
    >
      <Stack>
        {showOrganization ? (
          <Stack gap="xs">
            <Section title="Organization" loading={nameLoading ? 'one' : false}>
              {organization !== null ? <ListRow title={organization.name} /> : null}

              {mode === 'demo' ? null : (
                <ListRow
                  title="Switch organization"
                  subtitle={isOnline ? undefined : "You're offline"}
                  trailing={{ type: 'chevron' }}
                  disabled={!isOnline}
                  loading={switching.busy}
                  onPress={() => switching.start(close)}
                />
              )}
            </Section>

            {switching.failed ? <ActionFailed /> : null}
          </Stack>
        ) : null}

        {projects.length > 0 ? (
          <Stack gap="xs">
            <Section title="Project">
              {projects.map((item) => (
                <ListRow
                  key={item.id}
                  title={item.name}
                  trailing={{ type: 'check', selected: item.id === project?.id }}
                  onPress={() => choose(item.id)}
                />
              ))}
            </Section>

            {failed ? <ActionFailed /> : null}
          </Stack>
        ) : loading ? (
          <Section title="Project" loading />
        ) : status === 'error' ? (
          <LoadFailed title="Couldn't load your projects" onRetry={retry} />
        ) : null}
      </Stack>
    </Sheet>
  );
}
