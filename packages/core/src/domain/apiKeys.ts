export type ApiKey = {
  accessKey: string;
  description: string;
  createdAt: string;
  expiresAt: string | null;
  defaultProjectId: string;
  deletable: boolean;
};

export type ApiKeyExpiry = '30d' | '90d' | '1y' | 'never';

const DAY_MS = 86_400_000;

const EXPIRY_DAYS: Record<ApiKeyExpiry, number | null> = { '30d': 30, '90d': 90, '1y': 365, never: null };

// When a key created now expires (ISO), or null for `never`.
export function apiKeyExpiresAt(now: Date, expiry: ApiKeyExpiry): string | null {
  const days = EXPIRY_DAYS[expiry];

  return days === null ? null : new Date(now.getTime() + days * DAY_MS).toISOString();
}
