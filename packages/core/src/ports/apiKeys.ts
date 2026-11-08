import type { ApiKey, ApiKeyExpiry } from '../domain/apiKeys';

export type ApiKeysPort = {
  list(userId: string): Promise<ApiKey[]>;
  create(input: {
    userId: string;
    description: string;
    defaultProjectId: string;
    expiry: ApiKeyExpiry;
  }): Promise<{ apiKey: ApiKey; secretKey: string }>;
  remove(accessKey: string): Promise<void>;
};
