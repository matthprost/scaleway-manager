import type { AuthBrowserPort, LoginReceiverPort } from '@scaleway-manager/core';

// Demo mode never logs in through Scaleway: nothing starts and no callback ever arrives.
export const demoLoginReceiver: LoginReceiverPort = {
  start: async () => ({
    callbackUrl: '',
    nextCallback: () => new Promise<string>(() => {}),
    received: () => null,
    stop: async () => {},
  }),
};

export const demoAuthBrowser: AuthBrowserPort = {
  open: async () => 'cancelled',
  close: async () => {},
};
