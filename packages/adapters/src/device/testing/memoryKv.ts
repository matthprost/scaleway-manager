import type { KeyValueStore } from '../keyValueStore';

// Tests only: a key-value store kept in memory.
export const createMemoryKv = (initial: Record<string, string> = {}): KeyValueStore => {
  const map = new Map(Object.entries(initial));

  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
    removeItem: async (key) => {
      map.delete(key);
    },
  };
};
