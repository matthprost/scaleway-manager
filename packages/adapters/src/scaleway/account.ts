import { AppError } from '@scaleway-manager/core';
import type { AccountPort, SessionKeeper } from '@scaleway-manager/core';

import type { ScalewayHttp } from './http';

type UserResponse = { id: string; email: string; organization_id: string };

export const createScalewayAccount = (deps: { http: ScalewayHttp; keeper: SessionKeeper }): AccountPort => ({
  async getCurrentUser() {
    const session = await deps.keeper.current();
    if (session === null) {
      throw new AppError('unauthorized', 'No session');
    }
    const user = await deps.http.request<UserResponse>('GET', `/iam/v1alpha1/users/${encodeURIComponent(session.userId)}`);

    return { id: user.id, email: user.email, organizationId: user.organization_id };
  },
});
