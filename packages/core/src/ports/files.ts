export type FilesPort = {
  sharePdf(fileName: string, base64: string): Promise<void>;
  // Deletes the invoice file kept on the phone (logout).
  clear(): Promise<void>;
};
