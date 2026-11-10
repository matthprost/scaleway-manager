import type { ScreenPrivacyPort } from '@scaleway-manager/core';
import * as ScreenCapture from 'expo-screen-capture';

// Android: FLAG_SECURE, so screenshots and the app switcher's snapshot come out blank.
// iOS: nothing here; the lock feature's purple cover hides the app instead.
export const createScreenPrivacy = ({ platform }: { platform: string }): ScreenPrivacyPort => ({
  async protect() {
    if (platform === 'android') {
      await ScreenCapture.preventScreenCaptureAsync();
    }
  },

  async allow() {
    if (platform === 'android') {
      await ScreenCapture.allowScreenCaptureAsync();
    }
  },
});
