import { Pill } from '@scaleway-manager/ui';

import { useOfflineNotice } from './useOfflineNotice';

// "You're offline", then "Back online" for 2 seconds. Never in demo mode.
export function OfflineIndicator() {
  const notice = useOfflineNotice();

  return notice === null ? null : <Pill {...notice} />;
}
