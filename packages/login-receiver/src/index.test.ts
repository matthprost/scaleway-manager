import { requireNativeModule } from 'expo';
import { readFileSync } from 'fs';
import { join } from 'path';

import { nextCallback, received, start, stop } from './index';

jest.mock('expo', () => {
  const native = {
    start: jest.fn(async () => ({ port: 47815 })),
    nextCallback: jest.fn(async () => '/callback?token=abc'),
    received: jest.fn(() => '/callback?token=abc'),
    stop: jest.fn(async () => undefined),
  };

  return { requireNativeModule: jest.fn(() => native) };
});

const REPLY_PAGE =
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="refresh" content="0;url=scalewaymanager://auth/done"><title>Scaleway Manager</title></head><body><p>Login received. Returning to Scaleway Manager…</p><p><a href="scalewaymanager://auth/done">Return to the app</a></p></body></html>';

const nativeSource = (file: string) => readFileSync(join(__dirname, '..', file), 'utf8');

test('forwards each call to the native LoginReceiver module', async () => {
  const lookup = jest.mocked(requireNativeModule).mock;

  expect(lookup.calls).toEqual([['LoginReceiver']]);
  expect(await start()).toEqual({ port: 47815 });
  expect(await nextCallback()).toBe('/callback?token=abc');
  expect(received()).toBe('/callback?token=abc');
  await stop();
  expect(lookup.results[0]?.value.stop).toHaveBeenCalledTimes(1);
});

test('iOS and Android listen on both loopback addresses', () => {
  const swift = nativeSource('ios/LoginReceiverModule.swift');
  const kotlin = nativeSource('android/src/main/java/app/scalewaymanager/loginreceiver/LoginReceiverModule.kt');

  expect(swift).toContain('.ipv4(.loopback)');
  expect(swift).toContain('.ipv6(.loopback)');
  expect(kotlin).toContain('"127.0.0.1"');
  expect(kotlin).toContain('"::1"');
});

test('iOS and Android never leave ::1 to another app', () => {
  const swift = nativeSource('ios/LoginReceiverModule.swift');
  const kotlin = nativeSource('android/src/main/java/app/scalewaymanager/loginreceiver/LoginReceiverModule.kt');

  // 127.0.0.1 alone only when the phone has no IPv6 loopback; any other ::1 failure counts as busy
  expect(swift).toContain('.posix(.EADDRNOTAVAIL)');
  expect(kotlin).toContain('OsConstants.EADDRNOTAVAIL');
  expect(kotlin).not.toContain('EADDRINUSE');
  // iOS 27's Network won't open ::1 next to its own 127.0.0.1 (EADDRINUSE): a plain socket then holds ::1,
  // IPv6 only and bound, so no other app can take it; the port is ours only if that bind works
  expect(swift).toContain('error == .posix(.EADDRINUSE)');
  expect(swift).toContain('IPV6_V6ONLY');
  expect(swift).toContain('in6addr_loopback');
  expect(swift).toMatch(/ipv6 != nil \|\| noSuchAddress \|\| held != nil/);
  // Released on stop and before binding again
  expect(swift.match(/releaseHeldIPv6\(\)/g)?.length).toBeGreaterThanOrEqual(3);
});

test('iOS and Android send the same reply page', () => {
  expect(nativeSource('ios/LoginReceiverModule.swift')).toContain(REPLY_PAGE);
  expect(nativeSource('android/src/main/java/app/scalewaymanager/loginreceiver/LoginReceiverModule.kt')).toContain(
    REPLY_PAGE,
  );
});
