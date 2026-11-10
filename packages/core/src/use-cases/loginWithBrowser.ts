import type { AuthPort } from '../ports/auth';
import type { AuthBrowserPort } from '../ports/authBrowser';
import type { LoginReceiverPort } from '../ports/loginReceiver';
import type { SessionKeeper } from './sessionKeeper';

export const LOGIN_RETURN_URL = 'scalewaymanager://auth/done';

// fresh: Scaleway's page opens without the browser's saved sign-in (switching organization)
export const loginWithBrowser = async (
  deps: {
    auth: AuthPort;
    receiver: LoginReceiverPort;
    browser: AuthBrowserPort;
    keeper: SessionKeeper;
  },
  options: { fresh: boolean } = { fresh: false },
): Promise<'signed-in' | 'cancelled'> => {
  const receiver = await deps.receiver.start();
  let signedIn = false;

  try {
    const callback = receiver.nextCallback();
    // Stops an unhandled rejection if the receiver is stopped while waiting.
    callback.catch(() => undefined);
    const browserDone = deps.browser.open(deps.auth.loginUrl(receiver.callbackUrl), LOGIN_RETURN_URL, options);

    // The receiver captures the token before the browser is sent back, so received() is safe.
    const url = await Promise.race([callback, browserDone.then(() => receiver.received())]);
    if (url === null) {
      return 'cancelled';
    }
    await deps.browser.close();
    await deps.keeper.startFromCallback(url);
    signedIn = true;

    return 'signed-in';
  } finally {
    // Any other exit: close the sign-in sheet, or the user could finish towards a port we no longer hold.
    if (!signedIn) {
      await deps.browser.close().catch(() => undefined);
    }
    await receiver.stop();
  }
};
