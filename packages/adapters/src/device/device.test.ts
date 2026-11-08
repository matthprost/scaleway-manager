import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';
import { DEFAULT_PREFERENCES } from '@scaleway-manager/core';
import type { Session } from '@scaleway-manager/core';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import { createBiometric } from './biometric';
import { createConnectivity } from './connectivity';
import { createPreferences } from './preferences';
import { createSecureSessionStore } from './secureSessionStore';
import { createMemoryKv } from './testing/memoryKv';

const mockSecure = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
  getItemAsync: jest.fn(async (key: string) => mockSecure.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecure.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecure.delete(key);
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { configure: jest.fn(), fetch: jest.fn(), addEventListener: jest.fn() },
}));

const session: Session = {
  token: 't',
  renewToken: 'r',
  sessionId: 's',
  userId: 'u',
  expiresAt: '2030-01-01T00:00:00.000Z',
};

// A phone where the app ran before, so there is no first-run wipe.
const installedKv = () => createMemoryKv({ 'sm.installed': '1' });

beforeEach(() => {
  mockSecure.clear();
  jest.mocked(SecureStore.getItemAsync).mockClear();
  jest.mocked(SecureStore.setItemAsync).mockClear();
  jest.mocked(SecureStore.deleteItemAsync).mockClear();
});

test('secure store round-trips a session in three keys', async () => {
  const kv = installedKv();
  await createSecureSessionStore(kv).save(session);

  expect([...mockSecure.keys()].sort()).toEqual([
    'sm.session.meta',
    'sm.session.renewToken',
    'sm.session.token',
  ]);
  expect(await createSecureSessionStore(kv).load()).toEqual(session);
});

test('secure store load returns null when a key is missing', async () => {
  const kv = installedKv();
  await createSecureSessionStore(kv).save(session);
  mockSecure.delete('sm.session.renewToken');

  expect(await createSecureSessionStore(kv).load()).toBeNull();
});

test('secure store load returns null on corrupt meta', async () => {
  const kv = installedKv();
  await createSecureSessionStore(kv).save(session);
  mockSecure.set('sm.session.meta', '{nope');

  expect(await createSecureSessionStore(kv).load()).toBeNull();
});

test('secure store load returns null when meta lacks fields', async () => {
  const kv = installedKv();
  await createSecureSessionStore(kv).save(session);
  mockSecure.set('sm.session.meta', JSON.stringify({ sessionId: 's', userId: 1 }));

  expect(await createSecureSessionStore(kv).load()).toBeNull();
});

test('secure store reads the keychain once for several loads', async () => {
  const kv = installedKv();
  await createSecureSessionStore(kv).save(session);
  const store = createSecureSessionStore(kv);

  const loads = await Promise.all([store.load(), store.load()]);
  loads.push(await store.load());

  expect(loads).toEqual([session, session, session]);
  // One read is three keys.
  expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(3);
});

test('secure store save and clear keep the cache right', async () => {
  const store = createSecureSessionStore(installedKv());

  expect(await store.load()).toBeNull();
  await store.save(session);
  expect(await store.load()).toEqual(session);
  await store.clear();
  expect(await store.load()).toBeNull();

  expect(mockSecure.size).toBe(0);
  expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(3);
});

test('a failed save does not poison the cache', async () => {
  const kv = installedKv();
  await createSecureSessionStore(kv).save(session);
  const store = createSecureSessionStore(kv);
  expect(await store.load()).toEqual(session);
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keychain full'));

  await expect(store.save({ ...session, token: 'unsaved' })).rejects.toThrow('keychain full');

  expect(await store.load()).toEqual(session);
});

test('a clear during a save wins', async () => {
  const store = createSecureSessionStore(installedKv());
  const writes: (() => void)[] = [];
  // The Keychain write takes a while: it only lands when the test says so.
  const slowWrite = (key: string, value: string) =>
    new Promise<void>((resolve) => {
      writes.push(() => {
        mockSecure.set(key, value);
        resolve();
      });
    });
  jest
    .mocked(SecureStore.setItemAsync)
    .mockImplementationOnce(slowWrite)
    .mockImplementationOnce(slowWrite)
    .mockImplementationOnce(slowWrite);

  const saving = store.save(session);
  await new Promise((r) => setTimeout(r, 0));
  const clearing = store.clear();
  await new Promise((r) => setTimeout(r, 0));
  writes.forEach((write) => write());
  await Promise.all([saving, clearing]);

  expect(mockSecure.size).toBe(0);
  expect(await store.load()).toBeNull();
});

test('a failed save does not stop the next sign-out', async () => {
  const store = createSecureSessionStore(installedKv());
  await store.save(session);
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keychain full'));

  await expect(store.save({ ...session, token: 'unsaved' })).rejects.toThrow('keychain full');
  await store.clear();

  expect(mockSecure.size).toBe(0);
});

test('a clear asked right after a save on a new install still lands last', async () => {
  const store = createSecureSessionStore(createMemoryKv());
  // No wait in between: the clear must still run after the save's writes
  await Promise.all([store.save(session), store.clear()]);

  expect(mockSecure.size).toBe(0);
  expect(await store.load()).toBeNull();
});

test('a save before any load on a new install survives the next launch', async () => {
  const kv = createMemoryKv();
  await createSecureSessionStore(kv).save(session);

  expect(await createSecureSessionStore(kv).load()).toEqual(session);
});

test('secure store keeps the session on this phone only', async () => {
  const store = createSecureSessionStore(installedKv());
  await store.load();
  await store.save(session);
  await store.clear();

  const options = [
    ...jest.mocked(SecureStore.getItemAsync).mock.calls.map((call) => call[1]),
    ...jest.mocked(SecureStore.setItemAsync).mock.calls.map((call) => call[2]),
    ...jest.mocked(SecureStore.deleteItemAsync).mock.calls.map((call) => call[1]),
  ];

  expect(options).toEqual(Array(9).fill({ keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }));
});

test('the first load after an install wipes a session an old install left', async () => {
  await createSecureSessionStore(installedKv()).save(session);
  const kv = createMemoryKv();

  expect(await createSecureSessionStore(kv).load()).toBeNull();

  expect(mockSecure.size).toBe(0);
  expect(await kv.getItem('sm.installed')).not.toBeNull();
});

test('with the install marker, the first load keeps the saved session', async () => {
  const kv = installedKv();
  await createSecureSessionStore(kv).save(session);

  expect(await createSecureSessionStore(kv).load()).toEqual(session);
  expect(mockSecure.size).toBe(3);
});

test('preferences fall back to defaults on unreadable JSON', async () => {
  const prefs = createPreferences(createMemoryKv({ 'sm.preferences': '{nope' }));

  expect(await prefs.read()).toEqual(DEFAULT_PREFERENCES);
});

test('preferences update merges and persists', async () => {
  const kv = createMemoryKv();
  const next = await createPreferences(kv).update({ appearance: 'dark' });

  expect(next).toEqual({ ...DEFAULT_PREFERENCES, appearance: 'dark' });
  expect(await createPreferences(kv).read()).toEqual(next);
});

test('two updates at the same time to different fields both survive', async () => {
  const kv = createMemoryKv();
  const prefs = createPreferences(kv);

  // The Face ID switch and a project choice, saved at the same moment
  await Promise.all([prefs.update({ biometricLock: 'on' }), prefs.update({ projectIdByOrg: { 'org-a': 'p-1' } })]);

  expect(await createPreferences(kv).read()).toEqual({
    ...DEFAULT_PREFERENCES,
    biometricLock: 'on',
    projectIdByOrg: { 'org-a': 'p-1' },
  });
});

test('a failed preferences update does not block the next one', async () => {
  const kv = createMemoryKv();
  const setItem = kv.setItem;
  let full = true;
  kv.setItem = async (key, value) => {
    if (full) {
      full = false;
      throw new Error('disk full');
    }

    return setItem(key, value);
  };
  const prefs = createPreferences(kv);

  const first = prefs.update({ appearance: 'dark' });
  const second = prefs.update({ biometricLock: 'off' });

  await expect(first).rejects.toThrow('disk full');
  await expect(second).resolves.toEqual({ ...DEFAULT_PREFERENCES, biometricLock: 'off' });
});

test('connectivity turns off the reachability check, so no Google ping', async () => {
  jest.mocked(NetInfo.fetch).mockResolvedValue({
    isConnected: true,
    isInternetReachable: false,
  } as Awaited<ReturnType<typeof NetInfo.fetch>>);

  const connectivity = createConnectivity();
  const shouldRun = jest.mocked(NetInfo.configure).mock.lastCall?.[0].reachabilityShouldRun;

  expect(shouldRun?.()).toBe(false);
  expect(await connectivity.isOnline()).toBe(true);
});

test('connectivity ignores reachability and follows isConnected', () => {
  const listener = jest.fn();
  createConnectivity().subscribe(listener);
  const emit = jest.mocked(NetInfo.addEventListener).mock.lastCall?.[0];

  emit?.({ isConnected: true, isInternetReachable: null } as NetInfoState);
  emit?.({ isConnected: true, isInternetReachable: false } as NetInfoState);
  emit?.({ isConnected: false, isInternetReachable: true } as NetInfoState);

  expect(listener.mock.calls).toEqual([[true], [true], [false]]);
});

test('connectivity is offline when not connected', async () => {
  jest.mocked(NetInfo.fetch).mockResolvedValue({
    isConnected: false,
    isInternetReachable: null,
  } as Awaited<ReturnType<typeof NetInfo.fetch>>);

  expect(await createConnectivity().isOnline()).toBe(false);
});

test('biometric is unavailable without enrolment', async () => {
  jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
  jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);

  expect(await createBiometric().isAvailable()).toBe(false);
});
