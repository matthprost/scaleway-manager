import type { BiometricPort } from '@scaleway-manager/core';
import * as LocalAuthentication from 'expo-local-authentication';

export const createBiometric = (): BiometricPort => ({
  async isAvailable() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return false;
    }

    return LocalAuthentication.isEnrolledAsync();
  },

  async authenticate(reason) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      disableDeviceFallback: false,
    });

    return result.success;
  },
});
