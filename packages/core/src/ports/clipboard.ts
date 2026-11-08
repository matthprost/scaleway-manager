export type ClipboardPort = {
  // Every copy says whether it's a secret: `sensitive` hides it from Android's clipboard preview.
  copy(text: string, options: { sensitive: boolean }): Promise<void>;
};
