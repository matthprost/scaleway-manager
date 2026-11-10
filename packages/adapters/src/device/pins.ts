import type { PinsPort } from '@scaleway-manager/core';

import type { KeyValueStore } from './keyValueStore';

// All pins live under one entry: { [projectId]: keys }.
const PINS_KEY = 'sm.pins';

export const createPins = (kv: KeyValueStore): PinsPort => {
  // Toggles run one at a time, so two quick taps both count.
  let queue: Promise<unknown> = Promise.resolve();

  const readAll = async (): Promise<Record<string, string[]>> => {
    const raw = await kv.getItem(PINS_KEY);
    if (raw === null) {
      return {};
    }
    try {
      const saved: unknown = JSON.parse(raw);
      if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) {
        return {};
      }

      return Object.fromEntries(
        Object.entries(saved).map(([projectId, keys]) => [
          projectId,
          Array.isArray(keys) ? keys.filter((key): key is string => typeof key === 'string') : [],
        ]),
      );
    } catch {
      return {};
    }
  };

  return {
    async list(projectId) {
      const all = await readAll();

      return all[projectId] ?? [];
    },

    // Waits for a running toggle, so it can't write the pins back.
    clear() {
      const done = queue.then(() => kv.removeItem(PINS_KEY));
      queue = done.catch(() => undefined);

      return done;
    },

    toggle(projectId, key) {
      const done = queue.then(async () => {
        const all = await readAll();
        const pins = all[projectId] ?? [];
        const next = pins.includes(key) ? pins.filter((pin) => pin !== key) : [...pins, key];
        await kv.setItem(PINS_KEY, JSON.stringify({ ...all, [projectId]: next }));

        return next;
      });
      queue = done.catch(() => undefined);

      return done;
    },

    // Never pins: a key that isn't pinned stays off.
    remove(projectId, key) {
      const done = queue.then(async () => {
        const all = await readAll();
        const pins = all[projectId] ?? [];

        if (!pins.includes(key)) {
          return pins;
        }
        const next = pins.filter((pin) => pin !== key);
        await kv.setItem(PINS_KEY, JSON.stringify({ ...all, [projectId]: next }));

        return next;
      });
      queue = done.catch(() => undefined);

      return done;
    },
  };
};
