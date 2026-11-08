import type { ScreenPrivacyPort } from '@scaleway-manager/core';

// Demo never locks, and store screenshots come from it: nothing to hide.
export const demoScreenPrivacy: ScreenPrivacyPort = {
  protect: async () => {},
  allow: async () => {},
};
