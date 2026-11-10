import { apiKeyExpiresAt } from '@scaleway-manager/core';
import type { ApiKey, ApiKeysPort, ClockPort } from '@scaleway-manager/core';

import type { ScalewayHttp } from './http';
import { PAGE_SIZE, paginate } from './paginate';

// Only the fields we read: the secret is never copied into an ApiKey.
type ApiKeyResponse = {
  access_key: string;
  description: string;
  created_at: string;
  expires_at: string | null;
  default_project_id: string;
  deletable: boolean;
};

type ApiKeysResponse = { api_keys: ApiKeyResponse[]; total_count: number };

const toApiKey = (key: ApiKeyResponse): ApiKey => ({
  accessKey: key.access_key,
  description: key.description,
  createdAt: key.created_at,
  expiresAt: key.expires_at,
  defaultProjectId: key.default_project_id,
  deletable: key.deletable,
});

export const createScalewayApiKeys = (deps: { http: ScalewayHttp; clock: ClockPort }): ApiKeysPort => ({
  list(userId) {
    // `user_id` is deprecated: keys are filtered by their bearer.
    return paginate(async (page) => {
      const data = await deps.http.request<ApiKeysResponse>(
        'GET',
        `/iam/v1alpha1/api-keys?bearer_id=${userId}&bearer_type=user&page_size=${PAGE_SIZE}&page=${page}`,
      );

      return { items: data.api_keys.map(toApiKey), total: data.total_count };
    });
  },

  async create({ userId, description, defaultProjectId, expiry }) {
    const expiresAt = apiKeyExpiresAt(deps.clock.now(), expiry);
    const created = await deps.http.request<ApiKeyResponse & { secret_key: string }>(
      'POST',
      '/iam/v1alpha1/api-keys',
      {
        user_id: userId,
        description,
        default_project_id: defaultProjectId,
        // `never` sends no expiry at all.
        ...(expiresAt === null ? {} : { expires_at: expiresAt }),
      },
    );

    // Scaleway shows the secret only here: it goes back to the caller and nowhere else.
    return { apiKey: toApiKey(created), secretKey: created.secret_key };
  },

  async remove(accessKey) {
    await deps.http.request<void>('DELETE', `/iam/v1alpha1/api-keys/${encodeURIComponent(accessKey)}`);
  },
});
