import { DEFAULT_PREFERENCES } from '@scaleway-manager/core';
import type { Preferences, PreferencesPort } from '@scaleway-manager/core';

import type { KeyValueStore } from './keyValueStore';

const PREFERENCES_KEY = 'sm.preferences';

export const createPreferences = (kv: KeyValueStore): PreferencesPort => {
  const read = async (): Promise<Preferences> => {
    const raw = await kv.getItem(PREFERENCES_KEY);
    if (raw === null) {
      return { ...DEFAULT_PREFERENCES };
    }
    try {
      return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  };

  // Updates run one at a time, so two at once (the Face ID switch, a project choice) can't overwrite each other.
  // A failed one doesn't block the next.
  let queue: Promise<unknown> = Promise.resolve();

  return {
    read,
    update(patch) {
      const done = queue.then(async () => {
        const next = { ...(await read()), ...patch };
        await kv.setItem(PREFERENCES_KEY, JSON.stringify(next));

        return next;
      });
      queue = done.catch(() => undefined);

      return done;
    },
  };
};
