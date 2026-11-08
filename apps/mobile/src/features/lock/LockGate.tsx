import { ScreenReaderShield } from '@scaleway-manager/ui';
import type { ReactNode } from 'react';

import { EnableLockPrompt } from './EnableLockPrompt';
import { LockOverlay } from './LockOverlay';
import { useLockState } from './LockProvider';
import { PrivacyCover } from './PrivacyCover';

type LockGateProps = {
  children: ReactNode;
};

// Wraps the whole app: the lock screen and the "turn it on?" prompt sit above it.
// Until the launch decision is made, a plain purple cover keeps the app from flashing; while the app is away with the
// lock on, another one keeps it out of the app switcher.
export function LockGate({ children }: LockGateProps) {
  const { locked, decided, privacyCover, unlock, promptToEnable, answerPrompt } = useLockState();
  const covered = locked || !decided;
  const prompting = promptToEnable && !covered;
  // The lock screen already shows nothing of the app
  const hiddenForSwitcher = privacyCover && !covered;

  return (
    <>
      <ScreenReaderShield hidden={covered || prompting}>{children}</ScreenReaderShield>

      <EnableLockPrompt visible={prompting} onAnswer={answerPrompt} />

      <LockOverlay visible={covered} deciding={!decided} onUnlock={unlock} />

      <PrivacyCover visible={hiddenForSwitcher} />
    </>
  );
}
