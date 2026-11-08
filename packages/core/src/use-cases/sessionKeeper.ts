import { AppError } from '../domain/errors';
import type { Session } from '../domain/session';
import type { AuthPort } from '../ports/auth';
import type { SessionStorePort } from '../ports/sessionStore';

export type SessionKeeper = {
  current(): Promise<Session | null>;
  startFromCallback(callbackUrl: string): Promise<Session>;
  start(session: Session): Promise<void>;
  renew(): Promise<Session>;
  signOut(): Promise<void>;
  // replaced: the other login's session a new login took over from (switching organization), when there was one;
  // 'unknown' when the old one couldn't be read
  subscribe(listener: (session: Session | null, replaced?: Replaced) => void): () => void;
};

type Replaced = Session | 'unknown';

export const createSessionKeeper = (deps: { auth: AuthPort; store: SessionStorePort }): SessionKeeper => {
  const { auth, store } = deps;
  const listeners = new Set<(session: Session | null, replaced?: Replaced) => void>();
  let inFlight: Promise<Session> | null = null;
  // Bumped on sign-out and new login, so a renew already running can tell it is outdated.
  let generation = 0;

  const notify = (session: Session | null, replaced?: Replaced) => {
    listeners.forEach((listener) => (replaced === undefined ? listener(session) : listener(session, replaced)));
  };

  const start = async (session: Session) => {
    generation += 1;
    // A failed read may hide another login: it counts as replaced, so the app still wipes its data
    const previous = await store.load().catch(() => 'unknown' as const);
    const replaced =
      previous === 'unknown' || (previous !== null && previous.sessionId !== session.sessionId) ? previous : undefined;
    await store.save(session);
    generation += 1; // a renew that began meanwhile is outdated too
    notify(session, replaced);
    // A new login replaced another one (switching organization): telling Scaleway is best effort, as on sign-out
    if (replaced !== undefined && replaced !== 'unknown') {
      void auth.revoke(replaced).catch(() => undefined);
    }
  };

  // Used when a sign-out or new login happened during a renew.
  const currentOrUnauthorized = async (): Promise<Session> => {
    const latest = await store.load();
    if (latest === null) {
      throw new AppError('unauthorized', 'Signed out during renew');
    }

    return latest;
  };

  return {
    current: () => store.load(),

    async startFromCallback(callbackUrl) {
      const session = auth.sessionFromCallback(callbackUrl);
      await start(session);

      return session;
    },

    start,

    renew() {
      // Callers that ask while a renew runs share it.
      if (inFlight === null) {
        inFlight = (async () => {
          const stored = await store.load();
          if (stored === null) {
            throw new AppError('unauthorized', 'No session to renew');
          }
          const gen = generation;
          try {
            const renewed = await auth.renew(stored);
            if (gen !== generation) {
              return await currentOrUnauthorized();
            }
            await store.save(renewed);
            // Signed out while saving: the wipe removes it, so it is never announced.
            if (gen !== generation) {
              return await currentOrUnauthorized();
            }
            notify(renewed);

            return renewed;
          } catch (error) {
            if (gen !== generation) {
              return currentOrUnauthorized();
            }
            // Only a refusal ends the session; network errors keep it.
            if (error instanceof AppError && error.kind === 'unauthorized') {
              await store.clear();
              notify(null);
            }
            throw error;
          }
        })().finally(() => {
          inFlight = null;
        });
      }

      return inFlight;
    },

    // The phone is signed out at once; telling Scaleway (revoke) is best effort.
    async signOut() {
      generation += 1;
      const stored = await store.load().catch(() => null);
      await store.clear();
      generation += 1; // a renew that began before the wipe is outdated too
      notify(null);
      if (stored !== null) {
        void auth.revoke(stored).catch(() => undefined);
      }
    },

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};
