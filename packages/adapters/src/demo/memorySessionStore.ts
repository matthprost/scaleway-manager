import type { Session, SessionStorePort } from '@scaleway-manager/core';

export const createMemorySessionStore = (initial: Session | null = null): SessionStorePort => {
  let current = initial;

  return {
    load: async () => current,
    async save(session) {
      current = session;
    },
    async clear() {
      current = null;
    },
  };
};
