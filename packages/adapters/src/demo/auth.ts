import type { AuthPort } from '@scaleway-manager/core';

import { DEMO_SESSION } from './data';

export const createDemoAuth = (): AuthPort => ({
  loginUrl: () => '',
  sessionFromCallback: () => DEMO_SESSION,
  renew: async () => DEMO_SESSION,
  revoke: async () => {},
});
