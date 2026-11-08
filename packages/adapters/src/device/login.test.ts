import { createSessionKeeper, LOGIN_RETURN_URL, loginWithBrowser } from '@scaleway-manager/core';
import * as LoginReceiver from '@scaleway-manager/login-receiver';
import * as WebBrowser from 'expo-web-browser';
import type { WebBrowserAuthSessionResult } from 'expo-web-browser';

import { createDemoAuth } from '../demo/auth';
import { demoAuthBrowser, demoLoginReceiver } from '../demo/login';
import { createMemorySessionStore } from '../demo/memorySessionStore';
import { createAuthBrowser } from './authBrowser';
import { createLoginReceiver } from './loginReceiver';

jest.mock('@scaleway-manager/login-receiver', () => ({
  start: jest.fn(),
  nextCallback: jest.fn(),
  received: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  dismissAuthSession: jest.fn(),
}));

const LOGIN_URL = 'https://account.scaleway.com/login?redirectToUrl=x';

const browserResult = (type: string) => ({ type }) as WebBrowserAuthSessionResult;

// A stand-in for React Native's AppState that the test moves by hand
const fakeAppState = (currentState: string) => {
  let listener: (state: string) => void = () => undefined;
  const remove = jest.fn();
  const appState = {
    currentState,
    addEventListener: jest.fn((_type: string, next: (state: string) => void) => {
      listener = next;

      return { remove };
    }),
  };

  return { appState, remove, move: (state: string) => listener(state) };
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('wrapper builds the callback URL from the port', async () => {
  jest.mocked(LoginReceiver.start).mockResolvedValue({ port: 47816 });

  const receiver = await createLoginReceiver().start();

  expect(receiver.callbackUrl).toBe('http://localhost:47816/callback');
});

test('wrapper turns the request target into a full URL', async () => {
  jest.mocked(LoginReceiver.start).mockResolvedValue({ port: 47815 });
  jest.mocked(LoginReceiver.nextCallback).mockResolvedValue('/callback?token=abc');
  jest.mocked(LoginReceiver.received).mockReturnValueOnce(null).mockReturnValue('/callback?token=abc');

  const receiver = await createLoginReceiver().start();

  expect(receiver.received()).toBeNull();
  expect(await receiver.nextCallback()).toBe('http://localhost:47815/callback?token=abc');
  expect(receiver.received()).toBe('http://localhost:47815/callback?token=abc');
});

test('auth browser maps success to returned and cancel or dismiss to cancelled', async () => {
  const browser = createAuthBrowser({ platform: 'ios', appState: fakeAppState('active').appState });
  jest
    .mocked(WebBrowser.openAuthSessionAsync)
    .mockResolvedValueOnce({ type: 'success', url: LOGIN_RETURN_URL })
    .mockResolvedValueOnce(browserResult('cancel'))
    .mockResolvedValueOnce(browserResult('dismiss'));

  expect(await browser.open(LOGIN_URL, LOGIN_RETURN_URL, { fresh: false })).toBe('returned');
  expect(await browser.open(LOGIN_URL, LOGIN_RETURN_URL, { fresh: false })).toBe('cancelled');
  expect(await browser.open(LOGIN_URL, LOGIN_RETURN_URL, { fresh: false })).toBe('cancelled');
});

test('auth browser keeps Safari cookies, unless a fresh sign-in is asked (switching organization)', async () => {
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue(browserResult('cancel'));

  await createAuthBrowser({ platform: 'ios', appState: fakeAppState('active').appState }).open(LOGIN_URL, LOGIN_RETURN_URL, { fresh: false });

  expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(LOGIN_URL, LOGIN_RETURN_URL, {
    preferEphemeralSession: false,
  });

  await createAuthBrowser({ platform: 'ios', appState: fakeAppState('active').appState }).open(LOGIN_URL, LOGIN_RETURN_URL, { fresh: true });

  expect(WebBrowser.openAuthSessionAsync).toHaveBeenLastCalledWith(LOGIN_URL, LOGIN_RETURN_URL, {
    preferEphemeralSession: true,
  });
});

test('auth browser closes a leftover sign-in sheet before opening a new one', async () => {
  jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue(browserResult('cancel'));
  jest.mocked(WebBrowser.dismissAuthSession).mockClear();

  await createAuthBrowser({ platform: 'ios', appState: fakeAppState('active').appState }).open(LOGIN_URL, LOGIN_RETURN_URL, { fresh: false });

  expect(WebBrowser.dismissAuthSession).toHaveBeenCalledTimes(1);
  expect(jest.mocked(WebBrowser.dismissAuthSession).mock.invocationCallOrder[0]).toBeLessThan(
    jest.mocked(WebBrowser.openAuthSessionAsync).mock.invocationCallOrder.at(-1) ?? 0,
  );
});

test('auth browser close ignores errors', async () => {
  jest.mocked(WebBrowser.dismissAuthSession).mockImplementation(() => {
    throw new Error('dismissBrowser is not available on Android');
  });

  await expect(createAuthBrowser({ platform: 'ios', appState: fakeAppState('active').appState }).close()).resolves.toBeUndefined();
});

describe('auth browser close, on Android', () => {
  test("waits until the app is back in front: screens changed behind Chrome's custom tab crash Android when it returns", async () => {
    const { appState, remove, move } = fakeAppState('background');
    let closed = false;
    const closing = createAuthBrowser({ platform: 'android', appState }).close().then(() => {
      closed = true;
    });

    await Promise.resolve();
    move('inactive');
    await Promise.resolve();
    expect(closed).toBe(false);

    move('active');
    await closing;
    expect(closed).toBe(true);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test("never waits while React Native doesn't know the app's state yet (nothing would ever tell it to stop)", async () => {
    const { appState } = fakeAppState('active');

    await createAuthBrowser({ platform: 'android', appState: { ...appState, currentState: null } }).close();

    expect(appState.addEventListener).not.toHaveBeenCalled();
  });

  test('returns at once when the app is already in front', async () => {
    const { appState } = fakeAppState('active');

    await createAuthBrowser({ platform: 'android', appState }).close();

    expect(appState.addEventListener).not.toHaveBeenCalled();
  });

  test('iOS never waits: it closes its own sign-in sheet', async () => {
    const { appState } = fakeAppState('background');

    await createAuthBrowser({ platform: 'ios', appState }).close();

    expect(appState.addEventListener).not.toHaveBeenCalled();
  });
});

test('demo login never starts a receiver', async () => {
  const auth = createDemoAuth();
  const keeper = createSessionKeeper({ auth, store: createMemorySessionStore() });

  const result = await loginWithBrowser({ auth, receiver: demoLoginReceiver, browser: demoAuthBrowser, keeper });

  expect(result).toBe('cancelled');
  expect(LoginReceiver.start).not.toHaveBeenCalled();
  expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
  expect(await keeper.current()).toBeNull();
});
