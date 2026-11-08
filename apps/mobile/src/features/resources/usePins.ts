import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServices } from '../../wiring/ServicesProvider';
import { useWorkspace } from '../workspace/useWorkspace';

const NO_PINS: string[] = [];

export type Pins = {
  // Resource keys, in the order they were pinned
  pinned: string[];
  // Until the saved pins are read: Live resources waits, so cards don't jump when they arrive
  isLoading: boolean;
  toggle: (key: string) => Promise<void>;
  // Takes a pin off, never puts one on (a resource that no longer exists)
  remove: (key: string) => Promise<void>;
};

// The chosen project's pinned (starred) resources, saved on the phone.
export function usePins(): Pins {
  const { pins } = useServices();
  const { project } = useWorkspace();
  const queryClient = useQueryClient();
  const projectId = project?.id;
  const query = useQuery({
    queryKey: ['pins', projectId],
    queryFn: projectId === undefined ? skipToken : () => pins.list(projectId),
    // On the phone: it never waits for the network
    networkMode: 'always',
  });

  return {
    pinned: query.data ?? NO_PINS,
    isLoading: query.isPending,
    toggle: async (key) => {
      if (projectId === undefined) {
        return;
      }

      queryClient.setQueryData(['pins', projectId], await pins.toggle(projectId, key));
    },
    remove: async (key) => {
      if (projectId === undefined) {
        return;
      }

      queryClient.setQueryData(['pins', projectId], await pins.remove(projectId, key));
    },
  };
}
