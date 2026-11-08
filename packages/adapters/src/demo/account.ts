import type { AccountPort } from '@scaleway-manager/core';

import { DEMO_USER } from './data';

export const createDemoAccount = (): AccountPort => ({
  getCurrentUser: async () => DEMO_USER,
});
