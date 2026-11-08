import * as Sharing from 'expo-sharing';

import { createFiles } from './files';

// What happened to the cache, in order.
const mockEvents: string[] = [];
// Folders that exist in the fake cache.
const mockFolders = new Set<string>();

jest.mock('expo-file-system', () => {
  const join = (parent: { uri: string }, name: string) => `${parent.uri}${name}`;

  class Directory {
    uri: string;

    constructor(parent: { uri: string }, name: string) {
      this.uri = `${join(parent, name)}/`;
    }

    get exists() {
      return mockFolders.has(this.uri);
    }

    create() {
      mockEvents.push(`create ${this.uri}`);
      mockFolders.add(this.uri);
    }

    delete() {
      mockEvents.push(`delete ${this.uri}`);
      mockFolders.delete(this.uri);
    }
  }

  class File {
    uri: string;

    constructor(parent: { uri: string }, name: string) {
      this.uri = join(parent, name);
    }

    async write(content: string, options: { encoding: string }) {
      mockEvents.push(`write ${this.uri} ${options.encoding} ${content}`);
    }
  }

  return { Directory, File, Paths: { cache: { uri: 'file:///cache/' } } };
});

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(async (uri: string) => {
    mockEvents.push(`share ${uri}`);
  }),
}));

beforeEach(() => {
  mockEvents.length = 0;
  mockFolders.clear();
});

test('a pdf is written to its own cache folder and shared', async () => {
  await createFiles().sharePdf('invoice-2026-10.pdf', 'JVBERi0=');

  // Kept after sharing: the app it went to may still be reading it.
  expect(mockEvents).toEqual([
    'create file:///cache/invoices/',
    'write file:///cache/invoices/invoice-2026-10.pdf base64 JVBERi0=',
    'share file:///cache/invoices/invoice-2026-10.pdf',
  ]);
  expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/invoices/invoice-2026-10.pdf', {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
});

test('older invoice files are deleted before a new one is written', async () => {
  const files = createFiles();
  await files.sharePdf('invoice-2026-09.pdf', 'AAAA');
  mockEvents.length = 0;

  await files.sharePdf('invoice-2026-10.pdf', 'BBBB');

  expect(mockEvents).toEqual([
    'delete file:///cache/invoices/',
    'create file:///cache/invoices/',
    'write file:///cache/invoices/invoice-2026-10.pdf base64 BBBB',
    'share file:///cache/invoices/invoice-2026-10.pdf',
  ]);
});

test('a pdf keeps only the base name of its file name and ends with .pdf', async () => {
  const files = createFiles();

  await files.sharePdf('../../Documents/invoice.pdf', 'AAAA');
  await files.sharePdf('..', 'AAAA');
  await files.sharePdf('Invoice 2026-10', 'AAAA');
  await files.sharePdf('INVOICE.PDF', 'AAAA');

  expect(mockEvents.filter((event) => event.startsWith('share'))).toEqual([
    'share file:///cache/invoices/invoice.pdf',
    'share file:///cache/invoices/invoice.pdf',
    'share file:///cache/invoices/Invoice 2026-10.pdf',
    'share file:///cache/invoices/INVOICE.PDF',
  ]);
});

test('clear deletes the invoice folder', async () => {
  const files = createFiles();
  await files.sharePdf('invoice.pdf', 'AAAA');
  mockEvents.length = 0;

  await files.clear();
  // Nothing left to delete: no error.
  await files.clear();

  expect(mockEvents).toEqual(['delete file:///cache/invoices/']);
});
