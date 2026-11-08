import { AppError, formatDay } from '@scaleway-manager/core';
import type { Project, SshKey } from '@scaleway-manager/core';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServices } from '../../wiring/ServicesProvider';
import { queryFailure } from '../errors/queryFailure';
import { useWorkspace } from '../workspace/useWorkspace';

// How much of a fingerprint a row shows
const FINGERPRINT_SHOWN = 24;

export type SshKeyItem = SshKey & {
  // "SHA256:q3Xk7d1v0nYb2mZpW…", plus " · Disabled" for a key Scaleway turned off
  summary: string;
  // "12 Mar 2026", on the phone's calendar
  added: string;
};

type SshKeys = {
  // The selected project: SSH keys follow it
  project: Project | null;
  // undefined until they're on the phone
  keys: SshKeyItem[] | undefined;
  // Only while there's nothing to show
  error: AppError | null;
  // Loads again what failed
  retry: () => void;
  // Adds a key to the selected project, then the list shows it
  add: (input: { name: string; publicKey: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

// The selected project's SSH keys, and adding or deleting one.
export function useSshKeys(): SshKeys {
  const { sshKeys } = useServices();
  const queryClient = useQueryClient();
  const workspace = useWorkspace();
  const { project } = workspace;
  const projectId = project?.id;
  const query = useQuery({
    queryKey: ['ssh-keys', projectId],
    queryFn: projectId === undefined ? skipToken : () => sshKeys.list(projectId),
  });

  // Shown at once, then checked with Scaleway
  const update = (change: (keys: SshKey[]) => SshKey[]) => {
    queryClient.setQueryData<SshKey[]>(['ssh-keys', projectId], (keys) => (keys === undefined ? keys : change(keys)));
    void queryClient.invalidateQueries({ queryKey: ['ssh-keys', projectId] });
  };

  return {
    project,
    keys: query.data?.map((key) => {
      const fingerprint =
        key.fingerprint.length > FINGERPRINT_SHOWN ? `${key.fingerprint.slice(0, FINGERPRINT_SHOWN)}…` : key.fingerprint;

      return {
        ...key,
        summary: key.disabled ? `${fingerprint} · Disabled` : fingerprint,
        added: formatDay(new Date(key.createdAt)),
      };
    }),
    // Without a project there's nothing to ask about
    error:
      projectId === undefined && workspace.status === 'error'
        ? new AppError('unknown', "The projects couldn't be loaded")
        : queryFailure(workspace, query.data === undefined ? query.error : null),
    retry: () => {
      workspace.retry();
      if (query.isError) {
        void query.refetch();
      }
    },
    add: async ({ name, publicKey }) => {
      if (projectId === undefined) {
        throw new AppError('unknown', 'No project to add the key to');
      }

      const key = await sshKeys.create({ name, publicKey, projectId });
      update((keys) => [...keys, key]);
    },
    remove: async (id) => {
      await sshKeys.remove(id);
      update((keys) => keys.filter((key) => key.id !== id));
    },
  };
}
