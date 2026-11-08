import type { ConnectivityPort } from '@scaleway-manager/core';

export const demoConnectivity: ConnectivityPort = {
  isOnline: async () => true,
  subscribe: () => () => {},
};
