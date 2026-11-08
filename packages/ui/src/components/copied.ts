import { AccessibilityInfo } from 'react-native';

// What a copy control says once it has copied
export const COPIED = 'Copied';

// What a screen gives a copy control: it passes both on to its clipboard and returns its promise
export type CopyHandler<Options> = (text: string, options: Options) => void | Promise<void>;

// Copies are confirmed in place, not with a toast: a toast can't show above a sheet. The control says
// Copied once the screen's copy has finished. No live region holds the word, so both platforms are told.
export function confirmCopy(copying: void | Promise<void>, onCopied: () => void) {
  Promise.resolve(copying).then(
    () => {
      onCopied();
      AccessibilityInfo.announceForAccessibility(COPIED);
    },
    // A failed copy simply leaves the control saying Copy
    () => {},
  );
}
