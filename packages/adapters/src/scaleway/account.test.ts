import type { Session, SessionKeeper } from '@scaleway-manager/core';

import { createScalewayAccount } from './account';
import type { ScalewayHttp } from './http';

const session: Session = { token: 't-1', renewToken: 'r-1', sessionId: 'j-1', userId: 'u-1', expiresAt: '2026-11-06T10:00:00Z' };

describe('account', () => {
  it('account calls the user endpoint and maps organization_id', async () => {
    const request = jest.fn(async () => ({ id: 'u-1', email: 'a@b.c', organization_id: 'o-1' }));
    const account = createScalewayAccount({
      http: { request } as unknown as ScalewayHttp,
      keeper: { current: async () => session } as unknown as SessionKeeper,
    });

    await expect(account.getCurrentUser()).resolves.toEqual({ id: 'u-1', email: 'a@b.c', organizationId: 'o-1' });
    expect(request).toHaveBeenCalledWith('GET', '/iam/v1alpha1/users/u-1');
  });

  it('throws unauthorized without a session', async () => {
    const account = createScalewayAccount({
      http: { request: jest.fn() } as unknown as ScalewayHttp,
      keeper: { current: async () => null } as unknown as SessionKeeper,
    });

    await expect(account.getCurrentUser()).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('encodes the user id in the path', async () => {
    const request = jest.fn(async () => ({ id: 'u', email: 'a@b.c', organization_id: 'o-1' }));
    const account = createScalewayAccount({
      http: { request } as unknown as ScalewayHttp,
      keeper: { current: async () => ({ ...session, userId: 'a/../b?x=1' }) } as unknown as SessionKeeper,
    });

    await account.getCurrentUser();

    expect(request).toHaveBeenCalledWith('GET', '/iam/v1alpha1/users/a%2F..%2Fb%3Fx%3D1');
  });
});
