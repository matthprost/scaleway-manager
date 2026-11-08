import type { Preferences } from '../domain/preferences';

export const LOCK_TIMEOUT_MS = 300_000;

export const shouldLockOnLaunch = (input: {
  biometricLock: Preferences['biometricLock'];
  hasSession: boolean;
  biometricAvailable: boolean;
}): boolean => input.biometricLock === 'on' && input.hasSession && input.biometricAvailable;

// Also locks when the clock moved backwards (elapsed < 0).
export const shouldLockOnResume = (input: {
  biometricLock: Preferences['biometricLock'];
  backgroundedAt: Date | null;
  now: Date;
}): boolean => {
  if (input.biometricLock !== 'on' || input.backgroundedAt === null) {
    return false;
  }
  const elapsed = input.now.getTime() - input.backgroundedAt.getTime();

  return elapsed >= LOCK_TIMEOUT_MS || elapsed < 0;
};
