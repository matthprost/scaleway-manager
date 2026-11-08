import type { Session } from '../domain/session';
import type { AuthPort } from '../ports/auth';
import type { AuthBrowserPort } from '../ports/authBrowser';
import type { LoginReceiver, LoginReceiverPort } from '../ports/loginReceiver';
import { LOGIN_RETURN_URL, loginWithBrowser } from './loginWithBrowser';
import type { SessionKeeper } from './sessionKeeper';

const CALLBACK_URL = 'http://localhost:47815/callback';
const RECEIVED_URL = `${CALLBACK_URL}?token=abc`;
const never = <T>() => new Promise<T>(() => undefined);

const setup = (opts: {
  nextCallback: () => Promise<string>;
  received?: string | null;
  open: () => Promise<'returned' | 'cancelled'>;
}) => {
  const receiver: jest.Mocked<LoginReceiver> = {
    callbackUrl: CALLBACK_URL,
    nextCallback: jest.fn(opts.nextCallback),
    received: jest.fn(() => opts.received ?? null),
    stop: jest.fn(async () => undefined),
  };
  const receiverPort: LoginReceiverPort = { start: jest.fn(async () => receiver) };
  const browser: jest.Mocked<AuthBrowserPort> = {
    open: jest.fn((_url: string, _returnUrl: string, _options: { fresh: boolean }) => opts.open()),
    close: jest.fn(async () => undefined),
  };
  const auth = { loginUrl: jest.fn((_url: string) => 'https://login.scaleway.test') } as unknown as jest.Mocked<AuthPort>;
  const keeper = {
    startFromCallback: jest.fn(async () => ({}) as Session),
  } as unknown as jest.Mocked<SessionKeeper>;

  return { receiver, receiverPort, browser, auth, keeper };
};

const run = (s: ReturnType<typeof setup>, options?: { fresh: boolean }) =>
  loginWithBrowser({ auth: s.auth, receiver: s.receiverPort, browser: s.browser, keeper: s.keeper }, options);

describe('loginWithBrowser', () => {
  it('keeps the browser\'s saved sign-in by default, and opens a fresh one when asked (switching organization)', async () => {
    const usual = setup({ nextCallback: async () => RECEIVED_URL, open: () => never() });
    await run(usual);

    expect(usual.browser.open).toHaveBeenCalledWith('https://login.scaleway.test', LOGIN_RETURN_URL, { fresh: false });

    const fresh = setup({ nextCallback: async () => RECEIVED_URL, open: () => never() });
    await run(fresh, { fresh: true });

    expect(fresh.browser.open).toHaveBeenCalledWith('https://login.scaleway.test', LOGIN_RETURN_URL, { fresh: true });
  });

  it('signs in when the callback arrives first', async () => {
    const s = setup({ nextCallback: async () => RECEIVED_URL, open: () => never() });

    expect(await run(s)).toBe('signed-in');
    expect(s.keeper.startFromCallback).toHaveBeenCalledWith(RECEIVED_URL);
    expect(s.browser.close).toHaveBeenCalled();
    expect(s.receiver.stop).toHaveBeenCalled();
  });

  it('signs in when the browser returns after the callback', async () => {
    const s = setup({ nextCallback: () => never(), received: RECEIVED_URL, open: async () => 'returned' });

    expect(await run(s)).toBe('signed-in');
    expect(s.keeper.startFromCallback).toHaveBeenCalledWith(RECEIVED_URL);
    expect(s.receiver.stop).toHaveBeenCalled();
  });

  it('is cancelled when the browser closes without a callback', async () => {
    const s = setup({ nextCallback: () => never(), received: null, open: async () => 'cancelled' });

    expect(await run(s)).toBe('cancelled');
    expect(s.keeper.startFromCallback).not.toHaveBeenCalled();
    expect(s.browser.close).toHaveBeenCalled();
    expect(s.receiver.stop).toHaveBeenCalled();
  });

  it('stops the receiver when the token is invalid', async () => {
    const s = setup({ nextCallback: async () => RECEIVED_URL, open: () => never() });
    s.keeper.startFromCallback.mockRejectedValue(new Error('invalid token'));

    await expect(run(s)).rejects.toThrow('invalid token');
    expect(s.receiver.stop).toHaveBeenCalled();
  });

  it('closes the browser when the receiver fails', async () => {
    const s = setup({ nextCallback: () => Promise.reject(new Error('LISTENER_LOST')), open: () => never() });
    // Android can't close it: that error must not hide the receiver's.
    s.browser.close.mockRejectedValue(new Error('not available'));

    await expect(run(s)).rejects.toThrow('LISTENER_LOST');
    expect(s.browser.close).toHaveBeenCalled();
    expect(s.receiver.stop).toHaveBeenCalled();
  });

  it("opens Scaleway with the receiver's callback", async () => {
    const s = setup({ nextCallback: async () => RECEIVED_URL, open: () => never() });
    await run(s);

    expect(s.auth.loginUrl).toHaveBeenCalledWith('http://localhost:47815/callback');
    expect(s.browser.open).toHaveBeenCalledWith('https://login.scaleway.test', LOGIN_RETURN_URL, { fresh: false });
  });
});
