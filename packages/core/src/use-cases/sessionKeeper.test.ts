import { AppError } from '../domain/errors';
import type { Session } from '../domain/session';
import type { AuthPort } from '../ports/auth';
import type { SessionStorePort } from '../ports/sessionStore';
import { createSessionKeeper } from './sessionKeeper';

const session = (id: string): Session => ({
  token: `token-${id}`,
  renewToken: `renew-${id}`,
  sessionId: 'jti-1',
  userId: 'user-1',
  expiresAt: '2026-11-05T12:00:00.000Z',
});

const setup = (stored: Session | null = null) => {
  let current = stored;
  const auth: jest.Mocked<AuthPort> = {
    loginUrl: jest.fn((_url: string) => ''),
    sessionFromCallback: jest.fn((_url: string) => session('callback')),
    renew: jest.fn(async (_session: Session) => session('renewed')),
    revoke: jest.fn(async (_session: Session) => undefined),
  };
  const store: jest.Mocked<SessionStorePort> = {
    load: jest.fn(async () => current),
    save: jest.fn(async (s: Session) => {
      current = s;
    }),
    clear: jest.fn(async () => {
      current = null;
    }),
  };
  const keeper = createSessionKeeper({ auth, store });

  return { auth, store, keeper };
};

describe('createSessionKeeper', () => {
  it('startFromCallback saves the parsed session and returns it', async () => {
    const { auth, store, keeper } = setup();
    const result = await keeper.startFromCallback('http://localhost:47815/callback?x=1');

    expect(auth.sessionFromCallback).toHaveBeenCalledWith('http://localhost:47815/callback?x=1');
    expect(store.save).toHaveBeenCalledWith(session('callback'));
    expect(result).toEqual(session('callback'));
  });

  it('a new login replacing another session (switching organization) ends the old one, in the background', async () => {
    const old = { ...session('old'), sessionId: 'jti-old' };
    const { auth, keeper } = setup(old);
    auth.revoke.mockRejectedValue(new AppError('offline', 'no network'));

    await keeper.startFromCallback('http://localhost:47815/callback?x=1');

    expect(auth.revoke).toHaveBeenCalledWith(old);
    expect(await keeper.current()).toEqual(session('callback'));
  });

  it('tells listeners which session a new login replaced, and nothing for a renew', async () => {
    const old = { ...session('old'), sessionId: 'jti-old' };
    const { auth, keeper } = setup(old);
    const listener = jest.fn();
    keeper.subscribe(listener);

    await keeper.startFromCallback('http://localhost:47815/callback?x=1');
    await keeper.start(session('again'));
    await keeper.renew();

    expect(listener).toHaveBeenNthCalledWith(1, session('callback'), old);
    expect(listener).toHaveBeenNthCalledWith(2, session('again'));
    // A real renew: one argument, nothing ended
    expect(listener.mock.calls[2]).toEqual([session('renewed')]);
    expect(auth.revoke).toHaveBeenCalledTimes(1);
    expect(auth.revoke).toHaveBeenCalledWith(old);
  });

  it('a new login whose old session cannot be read still counts as replacing one, without ending anything', async () => {
    const { auth, store, keeper } = setup(session('stored'));
    const listener = jest.fn();
    store.load.mockRejectedValueOnce(new Error('Keychain locked'));
    keeper.subscribe(listener);

    await keeper.startFromCallback('http://localhost:47815/callback?x=1');

    expect(listener).toHaveBeenCalledWith(session('callback'), 'unknown');
    expect(auth.revoke).not.toHaveBeenCalled();
    expect(await keeper.current()).toEqual(session('callback'));
  });

  it('a renew that starts while a new login is saving never brings the old session back', async () => {
    const old = { ...session('old'), sessionId: 'jti-old' };
    const { auth, store, keeper } = setup(old);
    const listener = jest.fn();
    const save = store.save.getMockImplementation();
    let finishSave: () => void = () => undefined;
    let finishRenew: (s: Session) => void = () => undefined;
    store.save.mockImplementationOnce(async (s: Session) => {
      await new Promise<void>((resolve) => { finishSave = resolve; });
      await save?.(s);
    });
    auth.renew.mockReturnValue(new Promise<Session>((resolve) => { finishRenew = resolve; }));
    keeper.subscribe(listener);

    const login = keeper.startFromCallback('http://localhost:47815/callback?x=1');
    await new Promise((r) => setTimeout(r, 0));
    const renewing = keeper.renew();
    await new Promise((r) => setTimeout(r, 0));
    finishSave();
    await login;
    finishRenew({ ...old, token: 'token-old-renewed' });

    await expect(renewing).resolves.toEqual(session('callback'));
    expect(auth.renew).toHaveBeenCalledWith(old);
    expect(store.save).toHaveBeenCalledTimes(1);
    expect(await keeper.current()).toEqual(session('callback'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('the same session saved again (a renew) is not ended', async () => {
    const { auth, keeper } = setup(session('stored'));

    await keeper.start(session('renewed'));

    expect(auth.revoke).not.toHaveBeenCalled();
  });

  it('current returns the stored session after restart', async () => {
    const { auth, keeper } = setup(session('stored'));

    expect(await keeper.current()).toEqual(session('stored'));
    expect(auth.renew).not.toHaveBeenCalled();
  });

  it('renew calls auth.renew once for concurrent callers', async () => {
    const { auth, store, keeper } = setup(session('stored'));
    const results = await Promise.all([keeper.renew(), keeper.renew(), keeper.renew()]);

    expect(auth.renew).toHaveBeenCalledTimes(1);
    expect(store.save).toHaveBeenCalledWith(session('renewed'));
    expect(results).toEqual([session('renewed'), session('renewed'), session('renewed')]);
  });

  it('renew starts a new request after the previous one settled', async () => {
    const { auth, keeper } = setup(session('stored'));
    await keeper.renew();
    await keeper.renew();

    expect(auth.renew).toHaveBeenCalledTimes(2);
  });

  it('renew keeps the stored session when the network fails', async () => {
    const { auth, store, keeper } = setup(session('stored'));
    const listener = jest.fn();
    keeper.subscribe(listener);
    auth.renew.mockRejectedValue(new AppError('offline', 'no network'));

    await expect(keeper.renew()).rejects.toMatchObject({ kind: 'offline' });
    expect(store.clear).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalledWith(null);
  });

  it('renew signs out when Scaleway refuses', async () => {
    const { auth, store, keeper } = setup(session('stored'));
    const listener = jest.fn();
    keeper.subscribe(listener);
    auth.renew.mockRejectedValue(new AppError('unauthorized', 'refused', 401));

    await expect(keeper.renew()).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(store.clear).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith(null);
  });

  it('signOut clears local data even if revoke fails', async () => {
    const { auth, store, keeper } = setup(session('stored'));
    const listener = jest.fn();
    keeper.subscribe(listener);
    auth.revoke.mockRejectedValue(new AppError('offline', 'no network'));

    await keeper.signOut();

    expect(store.clear).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith(null);
  });

  it('signed out before revoke answers', async () => {
    const { auth, store, keeper } = setup(session('stored'));
    const listener = jest.fn();
    keeper.subscribe(listener);
    auth.revoke.mockReturnValue(new Promise<void>(() => undefined));

    await keeper.signOut();

    expect(auth.revoke).toHaveBeenCalledWith(session('stored'));
    expect(store.clear).toHaveBeenCalled();
    expect(await keeper.current()).toBeNull();
    expect(listener).toHaveBeenCalledWith(null);
  });

  it('signOut clears local data even if the stored session cannot be read', async () => {
    const { auth, store, keeper } = setup(session('stored'));
    const listener = jest.fn();
    keeper.subscribe(listener);
    store.load.mockRejectedValueOnce(new Error('keychain locked'));

    await keeper.signOut();

    expect(store.clear).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith(null);
    expect(auth.revoke).not.toHaveBeenCalled();
  });

  it('a renew started during sign-out never saves', async () => {
    const { auth, store, keeper } = setup(session('stored'));
    const listener = jest.fn();
    let finish: (s: Session) => void = () => undefined;
    let finishClear: () => void = () => undefined;
    auth.renew.mockReturnValue(new Promise<Session>((resolve) => { finish = resolve; }));
    // The wipe takes a while; until it ends, the old session can still be read.
    store.clear.mockImplementation(
      () => new Promise<void>((resolve) => { finishClear = resolve; }),
    );
    keeper.subscribe(listener);

    const signingOut = keeper.signOut();
    await new Promise((r) => setTimeout(r, 0));
    const renewing = keeper.renew();
    await new Promise((r) => setTimeout(r, 0));
    store.load.mockResolvedValue(null);
    finishClear();
    await signingOut;
    finish(session('renewed'));
    await expect(renewing).rejects.toMatchObject({ kind: 'unauthorized' });

    expect(auth.renew).toHaveBeenCalledWith(session('stored'));
    expect(store.save).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalledWith(session('renewed'));
  });

  it('signOut during renew stays signed out', async () => {
    const { auth, store, keeper } = setup(session('stored'));
    const listener = jest.fn();
    let finish: (s: Session) => void = () => undefined;
    auth.renew.mockReturnValue(new Promise<Session>((resolve) => { finish = resolve; }));
    keeper.subscribe(listener);

    const renewing = keeper.renew();
    await new Promise((r) => setTimeout(r, 0));
    await keeper.signOut();
    finish(session('renewed'));
    await expect(renewing).rejects.toMatchObject({ kind: 'unauthorized' });

    expect(await keeper.current()).toBeNull();
    expect(store.save).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalledWith(session('renewed'));
  });

  it('a renew still saving when sign-out starts is never announced', async () => {
    const { store, keeper } = setup(session('stored'));
    const listener = jest.fn();
    let finishSave: () => void = () => undefined;
    // The save is still writing; like the real store, a save that ends after a clear doesn't bring the session back.
    store.save.mockImplementationOnce(() => new Promise<void>((resolve) => { finishSave = resolve; }));
    keeper.subscribe(listener);

    const renewing = keeper.renew();
    await new Promise((r) => setTimeout(r, 0));
    expect(store.save).toHaveBeenCalledWith(session('renewed'));
    await keeper.signOut();
    finishSave();
    await expect(renewing).rejects.toMatchObject({ kind: 'unauthorized' });

    expect(listener).toHaveBeenLastCalledWith(null);
    expect(listener).not.toHaveBeenCalledWith(session('renewed'));
  });

  it('a new login during a refused renew keeps the new session', async () => {
    const { auth, store, keeper } = setup(session('stored'));
    const listener = jest.fn();
    let refuse: (e: Error) => void = () => undefined;
    auth.renew.mockReturnValue(new Promise<Session>((_resolve, reject) => { refuse = reject; }));
    keeper.subscribe(listener);

    const renewing = keeper.renew();
    await new Promise((r) => setTimeout(r, 0));
    await keeper.startFromCallback('http://localhost:47815/callback?x=1');
    refuse(new AppError('unauthorized', 'refused', 401));
    await expect(renewing).resolves.toEqual(session('callback'));

    expect(store.clear).not.toHaveBeenCalled();
    expect(await keeper.current()).toEqual(session('callback'));
    expect(listener).not.toHaveBeenCalledWith(null);
  });
});
