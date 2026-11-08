import { apiKeyExpiresAt } from './apiKeys';

describe('apiKeyExpiresAt', () => {
  const now = new Date(Date.UTC(2026, 10, 5));

  it('adds 30, 90 or 365 days to now', () => {
    expect(apiKeyExpiresAt(now, '30d')).toBe('2026-12-05T00:00:00.000Z');
    expect(apiKeyExpiresAt(now, '90d')).toBe('2027-02-03T00:00:00.000Z');
    expect(apiKeyExpiresAt(now, '1y')).toBe('2027-11-05T00:00:00.000Z');
  });

  it('is null for never', () => {
    expect(apiKeyExpiresAt(now, 'never')).toBeNull();
  });
});
