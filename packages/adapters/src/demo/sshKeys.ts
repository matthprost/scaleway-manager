import type { ClockPort, SshKey, SshKeysPort } from '@scaleway-manager/core';

export const createDemoSshKeys = (clock: ClockPort): SshKeysPort => {
  let keys: SshKey[] = [
    {
      id: 'demo-ssh-1',
      name: 'matthias-laptop',
      fingerprint: 'SHA256:q3Xk7d1v0nYb2mZpW9eHcT4uLrA8sFjG5oVtNi6KxQw',
      createdAt: '2026-03-12T10:15:00.000Z',
      projectId: 'demo-prod',
      disabled: false,
    },
    {
      id: 'demo-ssh-2',
      name: 'ci-deploy',
      fingerprint: 'SHA256:Hy2Rb8LwPz5cJt0eUaN4oQxVd7KmS1gFiE6vXn3Ytk9',
      createdAt: '2026-07-01T08:00:00.000Z',
      projectId: 'demo-prod',
      disabled: false,
    },
  ];
  let counter = 2;

  return {
    list: async (projectId) => keys.filter((key) => key.projectId === projectId),

    create: async ({ name, projectId }) => {
      counter += 1;
      const key: SshKey = {
        id: `demo-ssh-${counter}`,
        name,
        fingerprint: `SHA256:demo${String(counter).padStart(40, 'x')}`,
        createdAt: clock.now().toISOString(),
        projectId,
        disabled: false,
      };
      keys = [...keys, key];

      return key;
    },

    remove: async (id) => {
      keys = keys.filter((key) => key.id !== id);
    },
  };
};
