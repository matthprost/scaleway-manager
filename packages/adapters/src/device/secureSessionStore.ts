import type { Session, SessionStorePort } from '@scaleway-manager/core';
import * as SecureStore from 'expo-secure-store';

import type { KeyValueStore } from './keyValueStore';

const TOKEN_KEY = 'sm.session.token';
const RENEW_TOKEN_KEY = 'sm.session.renewToken';
const META_KEY = 'sm.session.meta';
// Kept in the plain key-value store, which (unlike the iOS Keychain) goes away with the app.
const INSTALL_MARKER_KEY = 'sm.installed';

// This phone only: not in backups, never moved to a new phone.
const ON_THIS_DEVICE: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

type SessionMeta = Pick<Session, 'sessionId' | 'userId' | 'expiresAt'>;

export const createSecureSessionStore = (kv: KeyValueStore): SessionStorePort => {
  // The session as last read or saved; null means "read the Keychain on the next load".
  let cached: Promise<Session | null> | null = null;
  // Runs once per launch, before the Keychain is used.
  let installChecked: Promise<void> | null = null;
  // Saves and clears reach the Keychain one at a time, in the order they were asked: a wipe always lands last.
  let queue: Promise<unknown> = Promise.resolve();
  // Bumped by every clear: a save asked before it doesn't refill the memory copy.
  let clears = 0;

  const inTurn = <T>(write: () => Promise<T>): Promise<T> => {
    const done = queue.then(write);
    queue = done.catch(() => undefined);

    return done;
  };

  const deleteAll = async () => {
    await Promise.all(
      [TOKEN_KEY, RENEW_TOKEN_KEY, META_KEY].map((key) => SecureStore.deleteItemAsync(key, ON_THIS_DEVICE)),
    );
  };

  // The Keychain outlives the app: on the first launch after an install, drop what an old install left.
  const checkInstall = (): Promise<void> => {
    installChecked ??= (async () => {
      if ((await kv.getItem(INSTALL_MARKER_KEY)) === null) {
        await deleteAll();
        await kv.setItem(INSTALL_MARKER_KEY, '1');
      }
    })().catch((error: unknown) => {
      // Try again next time.
      installChecked = null;
      throw error;
    });

    return installChecked;
  };

  return {
    load() {
      if (cached === null) {
        const reading = (async (): Promise<Session | null> => {
          await checkInstall();
          const [token, renewToken, meta] = await Promise.all([
            SecureStore.getItemAsync(TOKEN_KEY, ON_THIS_DEVICE),
            SecureStore.getItemAsync(RENEW_TOKEN_KEY, ON_THIS_DEVICE),
            SecureStore.getItemAsync(META_KEY, ON_THIS_DEVICE),
          ]);
          if (token === null || renewToken === null || meta === null) {
            return null;
          }
          try {
            const parsed: Partial<Record<keyof SessionMeta, unknown>> = JSON.parse(meta);
            const { sessionId, userId, expiresAt } = parsed;
            if (
              typeof sessionId !== 'string' ||
              typeof userId !== 'string' ||
              typeof expiresAt !== 'string'
            ) {
              return null;
            }

            return { token, renewToken, sessionId, userId, expiresAt };
          } catch {
            return null;
          }
        })();
        cached = reading;
        // A failed read isn't kept: the next load tries again.
        reading.catch(() => {
          if (cached === reading) {
            cached = null;
          }
        });
      }

      return cached;
    },

    save(session) {
      const clearsBefore = clears;

      return inTurn(async () => {
        await checkInstall();
        const { token, renewToken, sessionId, userId, expiresAt } = session;
        const meta: SessionMeta = { sessionId, userId, expiresAt };
        await Promise.all([
          SecureStore.setItemAsync(TOKEN_KEY, token, ON_THIS_DEVICE),
          SecureStore.setItemAsync(RENEW_TOKEN_KEY, renewToken, ON_THIS_DEVICE),
          SecureStore.setItemAsync(META_KEY, JSON.stringify(meta), ON_THIS_DEVICE),
        ]);
        // Only once it is really written, and only if no clear was asked meanwhile.
        if (clears === clearsBefore) {
          cached = Promise.resolve(session);
        }
      });
    },

    clear() {
      clears += 1;
      cached = Promise.resolve(null);

      return inTurn(async () => {
        await checkInstall();
        await deleteAll();
      });
    },
  };
};
