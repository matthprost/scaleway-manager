import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { useServices } from '../../wiring/ServicesProvider';

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const getSnapshot = () => onlineManager.isOnline();

// True while the phone is online (kept up to date by bindOnlineManager), and always in demo mode: the demo ignores
// connectivity, so nothing in it is ever turned off as offline.
export function useIsOnline(): boolean {
  const { mode } = useServices();
  const online = useSyncExternalStore(subscribe, getSnapshot);

  return mode === 'demo' || online;
}
