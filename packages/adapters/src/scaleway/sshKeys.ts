import type { SshKey, SshKeysPort } from '@scaleway-manager/core';

import type { ScalewayHttp } from './http';
import { PAGE_SIZE, paginate } from './paginate';

type SshKeyResponse = {
  id: string;
  name: string;
  fingerprint: string;
  created_at: string;
  project_id: string;
  disabled: boolean;
};

type SshKeysResponse = { ssh_keys: SshKeyResponse[]; total_count: number };

const toSshKey = (key: SshKeyResponse): SshKey => ({
  id: key.id,
  name: key.name,
  fingerprint: key.fingerprint,
  createdAt: key.created_at,
  projectId: key.project_id,
  disabled: key.disabled,
});

export const createScalewaySshKeys = (deps: { http: ScalewayHttp }): SshKeysPort => ({
  list(projectId) {
    return paginate(async (page) => {
      const data = await deps.http.request<SshKeysResponse>(
        'GET',
        `/iam/v1alpha1/ssh-keys?project_id=${projectId}&page_size=${PAGE_SIZE}&page=${page}`,
      );

      return { items: data.ssh_keys.map(toSshKey), total: data.total_count };
    });
  },

  async create({ name, publicKey, projectId }) {
    const key = await deps.http.request<SshKeyResponse>('POST', '/iam/v1alpha1/ssh-keys', {
      name,
      public_key: publicKey,
      project_id: projectId,
    });

    return toSshKey(key);
  },

  async remove(id) {
    await deps.http.request<void>('DELETE', `/iam/v1alpha1/ssh-keys/${encodeURIComponent(id)}`);
  },
});
