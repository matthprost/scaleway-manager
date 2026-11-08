import type { ClipboardPort } from '@scaleway-manager/core';
import * as Clipboard from 'expo-clipboard';

export const createClipboard = (): ClipboardPort => ({
  async copy(text, options) {
    // Android only: iOS keeps Universal Clipboard, so a secret can still be pasted on a Mac.
    await Clipboard.setStringAsync(text, { android: { isSensitive: options.sensitive } });
  },
});
