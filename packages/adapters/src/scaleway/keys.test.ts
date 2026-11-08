import type { ClockPort } from '@scaleway-manager/core';

import { createScalewayApiKeys } from './apiKeys';
import { createScalewaySshKeys } from './sshKeys';
import { fakeHttp } from './testing/fakeHttp';

const clock: ClockPort = { now: () => new Date(Date.UTC(2026, 10, 5)) };

const sshKey = (n: number, disabled = false) => ({
  id: `ssh-${n}`,
  name: `Key ${n}`,
  public_key: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${n} me@laptop`,
  fingerprint: `256 SHA256:fp${n} me@laptop (ssh-ed25519)`,
  created_at: '2026-10-01T08:00:00Z',
  updated_at: '2026-10-01T08:00:00Z',
  organization_id: 'org-1',
  project_id: 'p-1',
  disabled,
});

const apiKey = (accessKey: string, expiresAt: string | null = null) => ({
  access_key: accessKey,
  // Scaleway only fills this on create.
  secret_key: null,
  user_id: 'u-1',
  description: 'Terraform',
  created_at: '2026-10-01T08:00:00Z',
  updated_at: '2026-10-01T08:00:00Z',
  expires_at: expiresAt,
  default_project_id: 'p-1',
  editable: true,
  deletable: true,
  managed: false,
  creation_ip: '192.0.2.1',
});

const sshKeysPath = (page: number) => `/iam/v1alpha1/ssh-keys?project_id=p-1&page_size=100&page=${page}`;

// `user_id` is deprecated: keys are filtered by their bearer.
const apiKeysPath = '/iam/v1alpha1/api-keys?bearer_id=u-1&bearer_type=user&page_size=100&page=1';

test('ssh keys are listed for the project', async () => {
  const { request, http } = fakeHttp(
    {
      [sshKeysPath(1)]: { total_count: 101, ssh_keys: Array.from({ length: 100 }, (_, i) => sshKey(i + 1)) },
      [sshKeysPath(2)]: { total_count: 101, ssh_keys: [sshKey(101, true)] },
    },
    new Error('unexpected path'),
  );

  const keys = await createScalewaySshKeys({ http }).list('p-1');

  expect(keys).toHaveLength(101);
  expect(keys[0]).toStrictEqual({
    id: 'ssh-1',
    name: 'Key 1',
    fingerprint: '256 SHA256:fp1 me@laptop (ssh-ed25519)',
    createdAt: '2026-10-01T08:00:00Z',
    projectId: 'p-1',
    disabled: false,
  });
  // Disabled keys are listed too, so they can still be deleted.
  expect(keys[100]?.disabled).toBe(true);
  expect(request.mock.calls).toEqual([
    ['GET', sshKeysPath(1)],
    ['GET', sshKeysPath(2)],
  ]);
});

test('creating an ssh key sends the public key', async () => {
  const { request, http } = fakeHttp({ '/iam/v1alpha1/ssh-keys': sshKey(7) }, new Error('unexpected path'));

  const key = await createScalewaySshKeys({ http }).create({
    name: 'Key 7',
    publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI7 me@laptop',
    projectId: 'p-1',
  });

  expect(request.mock.calls).toEqual([
    [
      'POST',
      '/iam/v1alpha1/ssh-keys',
      { name: 'Key 7', public_key: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI7 me@laptop', project_id: 'p-1' },
    ],
  ]);
  expect(key).toStrictEqual({
    id: 'ssh-7',
    name: 'Key 7',
    fingerprint: '256 SHA256:fp7 me@laptop (ssh-ed25519)',
    createdAt: '2026-10-01T08:00:00Z',
    projectId: 'p-1',
    disabled: false,
  });
});

test('ssh and api keys are deleted by id and access key', async () => {
  // A delete answers 204, which ScalewayHttp turns into undefined.
  const { request, http } = fakeHttp({}, undefined);

  await createScalewaySshKeys({ http }).remove('ssh-1');
  await createScalewayApiKeys({ http, clock }).remove('SCW123');

  expect(request.mock.calls).toEqual([
    ['DELETE', '/iam/v1alpha1/ssh-keys/ssh-1'],
    ['DELETE', '/iam/v1alpha1/api-keys/SCW123'],
  ]);
});

test('api keys are listed for the user', async () => {
  const { request, http } = fakeHttp(
    { [apiKeysPath]: { total_count: 2, api_keys: [apiKey('SCW1'), apiKey('SCW2', '2027-01-01T00:00:00Z')] } },
    new Error('unexpected path'),
  );

  await expect(createScalewayApiKeys({ http, clock }).list('u-1')).resolves.toStrictEqual([
    {
      accessKey: 'SCW1',
      description: 'Terraform',
      createdAt: '2026-10-01T08:00:00Z',
      expiresAt: null,
      defaultProjectId: 'p-1',
      deletable: true,
    },
    {
      accessKey: 'SCW2',
      description: 'Terraform',
      createdAt: '2026-10-01T08:00:00Z',
      expiresAt: '2027-01-01T00:00:00Z',
      defaultProjectId: 'p-1',
      deletable: true,
    },
  ]);
  expect(request.mock.calls).toEqual([['GET', apiKeysPath]]);
});

test('api key expiry of 90 days is computed from the clock', async () => {
  const { request, http } = fakeHttp(
    { '/iam/v1alpha1/api-keys': { ...apiKey('SCW9'), secret_key: 'secret' } },
    new Error('unexpected path'),
  );

  await createScalewayApiKeys({ http, clock }).create({
    userId: 'u-1',
    description: 'CI',
    defaultProjectId: 'p-1',
    expiry: '90d',
  });

  expect(request.mock.calls).toEqual([
    [
      'POST',
      '/iam/v1alpha1/api-keys',
      { user_id: 'u-1', description: 'CI', default_project_id: 'p-1', expires_at: '2027-02-03T00:00:00.000Z' },
    ],
  ]);
});

test('api key with never expiry omits expires_at', async () => {
  const { request, http } = fakeHttp(
    { '/iam/v1alpha1/api-keys': { ...apiKey('SCW9'), secret_key: 'secret' } },
    new Error('unexpected path'),
  );

  await createScalewayApiKeys({ http, clock }).create({
    userId: 'u-1',
    description: 'CI',
    defaultProjectId: 'p-1',
    expiry: 'never',
  });

  // Strict: an `expires_at: undefined` key would fail too.
  expect(request.mock.calls).toStrictEqual([
    ['POST', '/iam/v1alpha1/api-keys', { user_id: 'u-1', description: 'CI', default_project_id: 'p-1' }],
  ]);
});

test('create returns the secret once', async () => {
  const secret = '7f3c1d2e-0000-4a5b-9c8d-123456789abc';
  const withSecret = { ...apiKey('SCW9', '2027-02-03T00:00:00Z'), secret_key: secret };
  const { http } = fakeHttp(
    {
      '/iam/v1alpha1/api-keys': withSecret,
      // Even if a list ever sent it back, it is dropped.
      [apiKeysPath]: { total_count: 1, api_keys: [withSecret] },
    },
    new Error('unexpected path'),
  );
  const apiKeys = createScalewayApiKeys({ http, clock });

  const created = await apiKeys.create({ userId: 'u-1', description: 'CI', defaultProjectId: 'p-1', expiry: '90d' });

  expect(created.secretKey).toBe(secret);
  // The key itself never carries the secret, so caching or listing it can't leak it.
  expect(created.apiKey).toStrictEqual({
    accessKey: 'SCW9',
    description: 'Terraform',
    createdAt: '2026-10-01T08:00:00Z',
    expiresAt: '2027-02-03T00:00:00Z',
    defaultProjectId: 'p-1',
    deletable: true,
  });
  expect(JSON.stringify(created.apiKey)).not.toContain(secret);
  expect(JSON.stringify(await apiKeys.list('u-1'))).not.toContain(secret);
});

test('an id is encoded in the path, so it cannot steer the API call', async () => {
  const { request, http } = fakeHttp({}, undefined);

  await createScalewaySshKeys({ http }).remove('a/../b?x=1');
  await createScalewayApiKeys({ http, clock }).remove('a/../b?x=1');

  expect(request.mock.calls).toEqual([
    ['DELETE', '/iam/v1alpha1/ssh-keys/a%2F..%2Fb%3Fx%3D1'],
    ['DELETE', '/iam/v1alpha1/api-keys/a%2F..%2Fb%3Fx%3D1'],
  ]);
});
