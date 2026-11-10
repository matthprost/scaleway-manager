import type { AuthBrowserPort } from '@scaleway-manager/core';
import * as WebBrowser from 'expo-web-browser';

// React Native's AppState, passed in by the app (this package doesn't depend on React Native)
type AppStateLike = {
  // Null or undefined while React Native doesn't know yet
  currentState: string | null | undefined;
  addEventListener(type: 'change', listener: (state: string) => void): { remove(): void };
};

// The phone's real browser, so every Scaleway sign-in method works.
export const createAuthBrowser = ({ platform, appState }: { platform: string; appState: AppStateLike }): AuthBrowserPort => ({
  async open(url, returnUrl, { fresh }) {
    // A sign-in sheet iOS never showed would block this one ("already open"): close any leftover first
    try {
      WebBrowser.dismissAuthSession();
    } catch {
      // Not available on Android, or nothing open.
    }
    // Usually not ephemeral: keeps the user's Scaleway, Google or company sign-in. Fresh (switching organization):
    // a private session, so Scaleway shows its sign-in page (iOS; Android's custom tab always keeps it).
    const result = await WebBrowser.openAuthSessionAsync(url, returnUrl, { preferEphemeralSession: fresh });

    return result.type === 'success' ? 'returned' : 'cancelled';
  },

  async close() {
    try {
      WebBrowser.dismissAuthSession();
    } catch {
      // Not available on Android, or already closed.
    }
    // Android can't close Chrome's custom tab: the page sends the user back by itself. Screens changed while the app
    // is hidden behind it crash Android's renderer when the app returns, so wait until it's in front again.
    const hidden = appState.currentState === 'background' || appState.currentState === 'inactive';
    if (platform === 'android' && hidden) {
      await new Promise<void>((resolve) => {
        const subscription = appState.addEventListener('change', (state) => {
          if (state === 'active') {
            subscription.remove();
            resolve();
          }
        });
      });
    }
  },
});
