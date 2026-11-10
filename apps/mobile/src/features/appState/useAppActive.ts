import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

// False while the app is away: in the app switcher, behind Control Center or a system prompt, or in the background.
// What's on screen then ends up in the phone's snapshot of the app. Any other state (unknown at launch) is in use.
// Updated in the app state listener, so it lands in the same render as the lock's own reaction to the change.
export function useAppActive(): boolean {
  const [state, setState] = useState<AppStateStatus | string | null | undefined>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setState);

    return () => subscription.remove();
  }, []);

  return state !== 'inactive' && state !== 'background';
}
