import type { FilesPort } from '@scaleway-manager/core';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const createFiles = (): FilesPort => {
  // The last shared invoice stays here until the next share or logout: the app it went to may still be reading it.
  const folder = new Directory(Paths.cache, 'invoices');

  const clear = async () => {
    if (folder.exists) {
      folder.delete();
    }
  };

  return {
    clear,

    async sharePdf(fileName, base64) {
      await clear();
      folder.create();

      // The name comes from the API: keep its last part only, so the file stays in the folder.
      const baseName = fileName.split(/[/\\]/).pop() ?? '';
      const name = /^\.*$/.test(baseName) ? 'invoice' : baseName;
      const file = new File(folder, /\.pdf$/i.test(name) ? name : `${name}.pdf`);
      await file.write(base64, { encoding: 'base64' });
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    },
  };
};
