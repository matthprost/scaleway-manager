import type { Session } from '../domain/session';

export type SessionStorePort = {
  load(): Promise<Session | null>;
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
};
