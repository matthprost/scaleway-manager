import { formatTime } from '@scaleway-manager/core';
import type { Pill } from '@scaleway-manager/ui';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { useIsOnline } from './useIsOnline';
import { useLastUpdatedAt } from './useLastUpdatedAt';

const BACK_ONLINE_MS = 2000;

type PillProps = ComponentProps<typeof Pill>;

// What the offline pill shows right now, or null. Never in demo mode.
export function useOfflineNotice(): PillProps | null {
  const { mode } = useServices();
  const online = useIsOnline();
  const lastUpdatedAt = useLastUpdatedAt();
  const [wasOnline, setWasOnline] = useState(online);
  const [justReconnected, setJustReconnected] = useState(false);

  // A change of connection is handled while rendering, so there is no flash.
  if (online !== wasOnline) {
    setWasOnline(online);
    setJustReconnected(online);
  }

  useEffect(() => {
    if (!justReconnected) {
      return undefined;
    }

    const timer = setTimeout(() => setJustReconnected(false), BACK_ONLINE_MS);

    return () => clearTimeout(timer);
  }, [justReconnected]);

  if (mode === 'demo') {
    return null;
  }

  if (!online) {
    return {
      tone: 'inverse',
      icon: 'wifi-off',
      label:
        lastUpdatedAt === null ? "You're offline" : `You're offline · showing data from ${formatTime(lastUpdatedAt)}`,
    };
  }

  return justReconnected ? { tone: 'success', icon: 'check', label: 'Back online' } : null;
}
