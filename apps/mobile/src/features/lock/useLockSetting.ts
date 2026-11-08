import { useEffect, useState } from 'react';

import { useServices } from '../../wiring/ServicesProvider';
import { useLockState } from './LockProvider';

type LockSetting = {
  // Hidden in demo mode and on phones without biometrics
  shown: boolean;
  on: boolean;
  change: (enable: boolean) => Promise<void>;
  failed: boolean;
};

// Account's Face ID switch. It shows the lock's own setting, so it's always what is saved; a cancelled scan isn't a
// failure.
export function useLockSetting(): LockSetting {
  const { biometric, mode } = useServices();
  const { lockOn, setEnabled } = useLockState();
  const [available, setAvailable] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    biometric
      .isAvailable()
      .then((answer) => {
        if (!cancelled) {
          setAvailable(answer);
        }
      })
      .catch(() => {
        // The row stays hidden.
      });

    return () => {
      cancelled = true;
    };
  }, [biometric]);

  const change = async (enable: boolean) => {
    setFailed(false);
    try {
      await setEnabled(enable);
    } catch {
      setFailed(true);
    }
  };

  return { shown: mode !== 'demo' && available, on: lockOn, change, failed };
}
