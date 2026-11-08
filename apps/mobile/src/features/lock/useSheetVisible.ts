import type { SheetVisibility } from '@scaleway-manager/ui';
import { useEffect } from 'react';

import { useStatusBarReports } from '../statusBar/StatusBarReports';
import { useLockState } from './LockProvider';

// Every sheet's `visible`. A sheet is its own window, above the lock screen, so it hides while the lock covers the app,
// and while the privacy cover keeps it out of the app switcher.
export function useSheetVisible(open: boolean): SheetVisibility {
  const { locked, decided, privacyCover } = useLockState();
  const { sheetShown } = useStatusBarReports();
  const lockCovers = locked || !decided || privacyCover;
  const shown = open && !lockCovers;

  // While it's up, the root layout's status bar knows (Android sheets take the screen's icon colour)
  useEffect(() => (shown ? sheetShown() : undefined), [shown, sheetShown]);

  return { open, lockCovers };
}
