import { apiKeyExpiresAt } from '@scaleway-manager/core';
import type { ApiKey, ApiKeysPort, ClockPort } from '@scaleway-manager/core';

export const createDemoApiKeys = (clock: ClockPort): ApiKeysPort => {
  const DAY = 86_400_000;
  let keys: ApiKey[] = [
    {
      accessKey: 'SCWDEMO00000000000A1',
      description: 'Scaleway Manager',
      createdAt: '2026-01-10T09:00:00.000Z',
      expiresAt: null,
      defaultProjectId: 'demo-prod',
      deletable: false,
    },
    {
      accessKey: 'SCWDEMO00000000000B2',
      description: 'Terraform',
      createdAt: '2026-06-02T14:30:00.000Z',
      expiresAt: new Date(clock.now().getTime() + 200 * DAY).toISOString(),
      defaultProjectId: 'demo-prod',
      deletable: true,
    },
  ];
  let counter = 2;

  return {
    list: async () => [...keys],

    create: async ({ description, defaultProjectId, expiry }) => {
      counter += 1;
      const now = clock.now();
      const apiKey: ApiKey = {
        accessKey: `SCWDEMO0000000000${String(counter).padStart(3, '0')}`,
        description,
        createdAt: now.toISOString(),
        expiresAt: apiKeyExpiresAt(now, expiry),
        defaultProjectId,
        deletable: true,
      };
      keys = [...keys, apiKey];

      return { apiKey, secretKey: 'demo-secret-xxxxxxxx' };
    },

    remove: async (accessKey) => {
      keys = keys.filter((key) => key.accessKey !== accessKey || !key.deletable);
    },
  };
};
