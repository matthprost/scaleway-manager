import type { ApiKey, ApiKeysPort, AppError } from '@scaleway-manager/core';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServices } from '../../wiring/ServicesProvider';
import { queryFailure } from '../errors/queryFailure';
import { useWorkspace } from '../workspace/useWorkspace';

type ApiKeys = {
  // Undefined until they're on the phone
  keys: ApiKey[] | undefined;
  // Only while there's nothing to show
  error: AppError | null;
  // Loads again what failed
  retry: () => void;
  // Straight to Scaleway, never through TanStack: the answer holds the secret, which only the sheet keeps
  create: ApiKeysPort['create'];
  remove: (accessKey: string) => Promise<void>;
};

// A key's name: its description, if it has one
export function apiKeyName(key: ApiKey): string {
  return key.description.trim() === '' ? 'No description' : key.description;
}

// Past its expiry date: Scaleway refuses it now
export function hasExpired(key: ApiKey, now: Date): boolean {
  return key.expiresAt !== null && new Date(key.expiresAt) <= now;
}

// The current user's API keys (whatever the project), and creating or deleting one.
export function useApiKeys(): ApiKeys {
  const { apiKeys } = useServices();
  const queryClient = useQueryClient();
  const workspace = useWorkspace();
  const userId = workspace.user?.id;
  const queryKey = ['api-keys', userId];
  const query = useQuery({
    queryKey,
    queryFn: userId === undefined ? skipToken : () => apiKeys.list(userId),
  });

  return {
    keys: query.data,
    error: queryFailure(workspace, query.data === undefined ? query.error : null),
    retry: () => {
      workspace.retry();
      if (query.isError) {
        void query.refetch();
      }
    },
    create: async (input) => {
      const created = await apiKeys.create(input);
      // The list (keys never hold a secret) catches up behind the sheet
      void queryClient.invalidateQueries({ queryKey });

      return created;
    },
    remove: async (accessKey) => {
      await apiKeys.remove(accessKey);
      // Gone from the list at once, then checked with Scaleway
      queryClient.setQueryData<ApiKey[]>(queryKey, (keys) => keys?.filter((key) => key.accessKey !== accessKey));
      void queryClient.invalidateQueries({ queryKey });
    },
  };
}
