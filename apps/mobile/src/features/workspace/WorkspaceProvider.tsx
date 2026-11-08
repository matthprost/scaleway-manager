import { DEFAULT_PREFERENCES } from '@scaleway-manager/core';
import { createContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import { useServices } from '../../wiring/ServicesProvider';

type SavedProjects = {
  // The chosen project of each organization; null until read
  get: () => Record<string, string> | null;
  // The first screen that needs it starts the read
  subscribe: (onChange: () => void) => () => void;
  save: (organizationId: string, projectId: string) => Promise<void>;
};

export const SavedProjectsContext = createContext<SavedProjects | null>(null);

type WorkspaceProviderProps = {
  children: ReactNode;
};

// The chosen project of each organization, shared so every screen switches together (saved in the preferences).
export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { preferences } = useServices();

  const saved = useMemo<SavedProjects>(() => {
    const store: { projectIdByOrg: Record<string, string> | null; reading: boolean; saving: Promise<void> } = {
      projectIdByOrg: null,
      reading: false,
      saving: Promise.resolve(),
    };
    const listeners = new Set<() => void>();
    const set = (next: Record<string, string>) => {
      store.projectIdByOrg = next;
      listeners.forEach((onChange) => onChange());
    };

    return {
      get: () => store.projectIdByOrg,
      subscribe: (onChange) => {
        listeners.add(onChange);
        if (!store.reading) {
          store.reading = true;
          void preferences
            .read()
            .catch(() => DEFAULT_PREFERENCES)
            .then((read) => {
              // A choice saved meanwhile is newer than this read.
              if (store.projectIdByOrg === null) {
                set(read.projectIdByOrg);
              }
            });
        }

        return () => {
          listeners.delete(onChange);
        };
      },
      // One save at a time; one that changes nothing writes nothing
      save: (organizationId, projectId) => {
        const run = store.saving.then(async () => {
          const current = await preferences.read();
          // A projectIdByOrg patch replaces the whole map: keep every other organization's choice
          const next = { ...current.projectIdByOrg, [organizationId]: projectId };
          if (current.projectIdByOrg[organizationId] !== projectId) {
            await preferences.update({ projectIdByOrg: next });
          }
          set(next);
        });
        store.saving = run.catch(() => undefined);

        return run;
      },
    };
  }, [preferences]);

  return <SavedProjectsContext.Provider value={saved}>{children}</SavedProjectsContext.Provider>;
}
