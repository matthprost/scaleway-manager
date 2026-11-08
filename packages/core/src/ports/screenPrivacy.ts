// Keeps the app's screen out of screenshots and the app switcher's snapshot (while the Face ID lock is on).
export type ScreenPrivacyPort = {
  protect(): Promise<void>;
  allow(): Promise<void>;
};
