import type { SshKey } from '../domain/sshKeys';

export type SshKeysPort = {
  list(projectId: string): Promise<SshKey[]>;
  create(input: { name: string; publicKey: string; projectId: string }): Promise<SshKey>;
  remove(id: string): Promise<void>;
};
