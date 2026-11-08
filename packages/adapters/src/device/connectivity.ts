import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';
import type { ConnectivityPort } from '@scaleway-manager/core';

// Only "is there a network?": NetInfo's own check pings Google, and the app only talks to Scaleway.
const toOnline = (state: NetInfoState): boolean => state.isConnected === true;

export const createConnectivity = (): ConnectivityPort => {
  NetInfo.configure({ reachabilityShouldRun: () => false });

  return {
    async isOnline() {
      return toOnline(await NetInfo.fetch());
    },

    subscribe(listener) {
      return NetInfo.addEventListener((state) => listener(toOnline(state)));
    },
  };
};
