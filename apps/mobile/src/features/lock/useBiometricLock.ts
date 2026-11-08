import { shouldLockOnLaunch, shouldLockOnResume } from '@scaleway-manager/core';
import type { Preferences } from '@scaleway-manager/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useServices } from '../../wiring/ServicesProvider';
import { useAppActive } from '../appState/useAppActive';
import { useSession } from '../session/SessionProvider';
import { getLockCopy } from './lockCopy';

type BiometricLock = {
  locked: boolean;
  // false until we know whether the app starts locked (the splash waits for it)
  decided: boolean;
  // The saved setting: the Face ID lock is on
  lockOn: boolean;
  // The lock is on and the app is inactive or in the background: a cover keeps data out of the app switcher
  privacyCover: boolean;
  unlock: () => Promise<void>;
  promptToEnable: boolean;
  answerPrompt: (enable: boolean) => Promise<void>;
  // Turns the lock on (after a good scan) or off. Resolves to the lock's new state.
  setEnabled: (enable: boolean) => Promise<boolean>;
};

// Locks the app on launch and after 5 minutes in the background; offers to turn the lock on.
export function useBiometricLock(): BiometricLock {
  const { biometric, preferences, clock, mode, screenPrivacy } = useServices();
  const { status } = useSession();
  const [locked, setLocked] = useState(false);
  const [launchDone, setLaunchDone] = useState(false);
  const [promptToEnable, setPromptToEnable] = useState(false);
  // The saved setting, known before the app leaves (the cover can't wait for a read)
  const [lockOn, setLockOn] = useState(false);
  const appActive = useAppActive();
  const launchChecked = useRef(false);
  const asking = useRef(false);
  const backgroundedAt = useRef<Date | null>(null);
  // Read when the app goes to the background, so coming back can cover it at once ('unknown' until it answers)
  const lockSetting = useRef<Preferences['biometricLock'] | 'unknown'>('off');
  const statusRef = useRef(status);
  const active = mode === 'real';
  // Signed in with the lock on: Android keeps the screen out of screenshots and the app switcher
  const protectScreen = active && status === 'signed-in' && lockOn;

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    void (protectScreen ? screenPrivacy.protect() : screenPrivacy.allow()).catch(() => {
      // Nothing more to do: the privacy cover still hides the app
    });
  }, [protectScreen, screenPrivacy]);

  const unlock = useCallback(async () => {
    if (asking.current) {
      return;
    }
    asking.current = true;
    try {
      if (await biometric.authenticate('Unlock Scaleway Manager')) {
        setLocked(false);
      }
    } catch {
      // Still locked: the Unlock button tries again.
    } finally {
      asking.current = false;
    }
  }, [biometric]);

  // Launch: lock once the saved session is known.
  useEffect(() => {
    if (!active || status === 'loading' || launchChecked.current) {
      return;
    }
    launchChecked.current = true;
    // Signed out: nothing to lock, no need to read anything.
    if (status !== 'signed-in') {
      void Promise.resolve().then(() => setLaunchDone(true));

      return;
    }
    void (async () => {
      try {
        const { biometricLock } = await preferences.read();

        // Lock off or never asked: nothing to lock either.
        if (biometricLock !== 'on') {
          setLaunchDone(true);

          return;
        }
        const biometricAvailable = await biometric.isAvailable();

        if (biometricLock === 'on' && !biometricAvailable) {
          await preferences.update({ biometricLock: 'off' });
          setLockOn(false);
        } else if (shouldLockOnLaunch({ biometricLock, hasSession: true, biometricAvailable })) {
          setLocked(true);
          setLaunchDone(true);
          await unlock();
        }
      } catch {
        // If we can't read the settings, don't lock anyone out.
      } finally {
        setLaunchDone(true);
      }
    })();
  }, [active, status, preferences, biometric, unlock]);

  // Resume: lock when the app was away for too long.
  useEffect(() => {
    if (!active) {
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt.current = clock.now();
        lockSetting.current = 'unknown';
        // If we can't read the settings, don't lock anyone out.
        void preferences.read().then(
          (saved) => {
            lockSetting.current = saved.biometricLock;
          },
          () => {
            lockSetting.current = 'off';
          },
        );

        return;
      }
      if (state !== 'active') {
        return;
      }
      // Take the time once, so a quick inactive/active blip can't lock again.
      const since = backgroundedAt.current;
      const setting = lockSetting.current;

      backgroundedAt.current = null;
      // Not read yet: cover anyway; the check below uncovers if the lock is off.
      if (
        statusRef.current !== 'signed-in' ||
        !shouldLockOnResume({ biometricLock: setting === 'unknown' ? 'on' : setting, backgroundedAt: since, now: clock.now() })
      ) {
        return;
      }
      // Cover first, check after: the app never shows before the lock.
      setLocked(true);
      void (async () => {
        if (setting === 'unknown' && (await preferences.read()).biometricLock !== 'on') {
          setLocked(false);

          return;
        }
        if (await biometric.isAvailable()) {
          await unlock();
        } else {
          await preferences.update({ biometricLock: 'off' });
          setLockOn(false);
          setLocked(false);
        }
      })().catch(() => setLocked(false));
    });

    return () => subscription.remove();
  }, [active, clock, preferences, biometric, unlock]);

  // First sign-in: offer to turn the lock on. Signing out closes it.
  useEffect(() => {
    if (!active || status !== 'signed-in') {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { biometricLock } = await preferences.read();

        if (!cancelled) {
          setLockOn(biometricLock === 'on');
        }
        if (biometricLock === 'unasked' && (await biometric.isAvailable()) && !cancelled) {
          setPromptToEnable(true);
        }
      } catch {
        // No prompt if we can't read the settings.
      }
    })();

    return () => {
      cancelled = true;
      setPromptToEnable(false);
    };
  }, [active, status, preferences, biometric]);

  const setEnabled = useCallback(
    async (enable: boolean) => {
      if (enable && !(await biometric.authenticate(getLockCopy().enableReason))) {
        return false;
      }
      await preferences.update({ biometricLock: enable ? 'on' : 'off' });
      setLockOn(enable);

      return enable;
    },
    [biometric, preferences],
  );

  const answerPrompt = useCallback(
    async (enable: boolean) => {
      setPromptToEnable(false);
      try {
        // A failed scan leaves it unasked, so Account can still turn it on later.
        if (enable) {
          await setEnabled(true);
        } else {
          await preferences.update({ biometricLock: 'off' });
        }
      } catch {
        // Nothing saved: it will ask again next time.
      }
    },
    [preferences, setEnabled],
  );

  return {
    locked: active && locked,
    decided: !active || launchDone,
    lockOn: active && lockOn,
    privacyCover: active && status === 'signed-in' && lockOn && !appActive,
    unlock,
    promptToEnable: active && status === 'signed-in' && promptToEnable,
    answerPrompt,
    setEnabled,
  };
}
