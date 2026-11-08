import * as Clipboard from 'expo-clipboard';

import { createClipboard } from './clipboard';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

beforeEach(() => {
  jest.mocked(Clipboard.setStringAsync).mockClear();
});

test('a sensitive copy is marked sensitive on Android only', async () => {
  await createClipboard().copy('secret', { sensitive: true });

  // No iOS option: it still reaches the user's Mac through Universal Clipboard.
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith('secret', { android: { isSensitive: true } });
});

test('a normal copy is not marked sensitive', async () => {
  await createClipboard().copy('SCW123', { sensitive: false });

  expect(Clipboard.setStringAsync).toHaveBeenCalledWith('SCW123', { android: { isSensitive: false } });
});

test('every copy says whether it is a secret (checked by the type checker)', () => {
  const clipboard = createClipboard();
  // Never called: only `pnpm typecheck` reads these
  const forgetful = [
    // @ts-expect-error a caller can't forget the flag: a secret would show in Android's clipboard preview
    () => clipboard.copy('SCW123'),
    // @ts-expect-error the flag itself is required too
    () => clipboard.copy('SCW123', {}),
  ];

  expect(forgetful).toHaveLength(2);
});
