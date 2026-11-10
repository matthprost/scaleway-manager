import type { Session, SessionKeeper } from '@scaleway-manager/core';

import { createScalewayHttp, safeFetch } from './http';

const session: Session = { token: 't-1', renewToken: 'r-1', sessionId: 'j-1', userId: 'u-1', expiresAt: '2026-11-06T10:00:00Z' };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

const setup = (responses: (Response | Error)[]) => {
  const queue = [...responses];
  const fetchMock = jest.fn(async (_url: unknown, _init?: unknown) => {
    const next = queue.shift();
    if (next instanceof Error) {
      throw next;
    }
    if (next === undefined) {
      throw new Error('no response queued');
    }

    return next;
  });
  const renew = jest.fn(async () => ({ ...session, token: 't-2' }));
  const keeper = {
    current: async () => session,
    renew,
  } as unknown as SessionKeeper;
  const http = createScalewayHttp({ fetch: fetchMock as unknown as typeof fetch, keeper });

  return { http, fetchMock, renew };
};

const headersOf = (call: unknown[]) => (call[1] as { headers: Record<string, string> }).headers;

describe('http', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('http sends the session header', async () => {
    const { http, fetchMock } = setup([json(200, { ok: true })]);

    const result = await http.request('GET', '/x');

    expect(result).toEqual({ ok: true });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.scaleway.com/x');
    expect(headersOf(fetchMock.mock.calls[0] ?? [])['X-Session-Token']).toBe('t-1');
    expect(headersOf(fetchMock.mock.calls[0] ?? [])['Content-Type']).toBeUndefined();
  });

  it('sends a JSON body with a content type', async () => {
    const { http, fetchMock } = setup([json(200, {})]);

    await http.request('POST', '/x', { a: 1 });

    const init = fetchMock.mock.calls[0]?.[1] as { body: string };
    expect(init.body).toBe('{"a":1}');
    expect(headersOf(fetchMock.mock.calls[0] ?? [])['Content-Type']).toBe('application/json');
  });

  it('returns undefined on 204', async () => {
    const { http } = setup([new Response(null, { status: 204 })]);

    await expect(http.request('DELETE', '/x')).resolves.toBeUndefined();
  });

  it('http retries once after renewing on 401', async () => {
    const { http, fetchMock, renew } = setup([json(401, {}), json(200, { ok: 1 })]);
    renew.mockImplementation(async () => {
      return { ...session, token: 't-2' };
    });

    await expect(http.request('GET', '/x')).resolves.toEqual({ ok: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(renew).toHaveBeenCalledTimes(1);
    expect(headersOf(fetchMock.mock.calls[1] ?? [])['X-Session-Token']).toBe('t-2');
  });

  it('http does not loop when the retry is also 401', async () => {
    const { http, fetchMock } = setup([json(401, {}), json(401, {})]);

    await expect(http.request('GET', '/x')).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('http maps 403, 404 and 500 with Scaleway message', async () => {
    const { http } = setup([
      json(403, { message: 'denied' }),
      json(404, { message: 'missing' }),
      json(500, { message: 'boom' }),
      json(418, { message: 'teapot' }),
    ]);

    await expect(http.request('GET', '/a')).rejects.toMatchObject({ kind: 'forbidden', message: 'denied', status: 403 });
    await expect(http.request('GET', '/a')).rejects.toMatchObject({ kind: 'not_found', message: 'missing' });
    await expect(http.request('GET', '/a')).rejects.toMatchObject({ kind: 'server', message: 'boom' });
    await expect(http.request('GET', '/a')).rejects.toMatchObject({ kind: 'unknown', message: 'teapot' });
  });

  it("a refusal says Scaleway's own help (details[].help_message) when it gives some", async () => {
    const { http } = setup([
      json(400, {
        message: 'invalid argument(s)',
        type: 'invalid_arguments',
        details: [
          { argument_name: 'expires_at', reason: 'constraint', help_message: 'API keys must expire within one year.' },
          { argument_name: 'description', reason: 'constraint', help_message: '' },
        ],
      }),
      json(400, { message: 'invalid argument(s)', details: [{ argument_name: 'name', reason: 'required' }] }),
    ]);

    await expect(http.request('POST', '/a')).rejects.toMatchObject({
      kind: 'unknown',
      message: 'API keys must expire within one year.',
      reason: 'API keys must expire within one year.',
      status: 400,
    });
    // No help: the message
    await expect(http.request('POST', '/a')).rejects.toMatchObject({
      message: 'invalid argument(s)',
      reason: 'invalid argument(s)',
      status: 400,
    });
  });

  it("an answer without Scaleway's words has no reason to show, only a message for us", async () => {
    const { http } = setup([new Response('<html>conflict</html>', { status: 409 }), json(400, { message: '  ' })]);

    const conflict = await http.request('POST', '/a').catch((error: unknown) => error);
    const blank = await http.request('POST', '/a').catch((error: unknown) => error);

    expect(conflict).toMatchObject({ kind: 'unknown', message: 'Request failed with status 409', status: 409 });
    expect((conflict as { reason?: string }).reason).toBeUndefined();
    expect((blank as { reason?: string }).reason).toBeUndefined();
  });

  it('http maps a non-JSON success body to unknown', async () => {
    const { http } = setup([new Response('<html>', { status: 200 })]);

    await expect(http.request('GET', '/a')).rejects.toMatchObject({ kind: 'unknown' });
  });

  it('maps a rejecting fetch to offline', async () => {
    const { http } = setup([new TypeError('Network request failed')]);

    await expect(http.request('GET', '/a')).rejects.toMatchObject({ kind: 'offline' });
  });

  it('a request that never answers fails as offline after 20 s', async () => {
    jest.useFakeTimers();
    // Like a real fetch: it only gives up when its signal aborts.
    const fetchMock = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    );
    const keeper = { current: async () => session, renew: jest.fn() } as unknown as SessionKeeper;
    const http = createScalewayHttp({ fetch: fetchMock as unknown as typeof fetch, keeper });
    let outcome: unknown = 'waiting';
    void http.request('GET', '/x').then(
      () => {
        outcome = 'answered';
      },
      (error: unknown) => {
        outcome = error;
      },
    );

    await jest.advanceTimersByTimeAsync(19_999);
    expect(outcome).toBe('waiting');

    await jest.advanceTimersByTimeAsync(1);
    expect(outcome).toMatchObject({ kind: 'offline' });
  });

  it("safeFetch keeps the caller's signal: cancelling also cancels the request", async () => {
    jest.useFakeTimers();
    // Like a real fetch: it only gives up when its signal aborts.
    const fetchMock = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    );
    const caller = new AbortController();
    const request = safeFetch(fetchMock as unknown as typeof fetch, 'https://api.scaleway.com/x', { signal: caller.signal });
    caller.abort();

    expect(fetchMock.mock.calls[0]?.[1].signal?.aborted).toBe(true);
    await expect(request).rejects.toMatchObject({ kind: 'offline' });
  });

  it('safeFetch with a signal that is already cancelled cancels at once', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn(async (_url: string, _init: RequestInit) => new Response(null, { status: 204 }));
    const caller = new AbortController();
    caller.abort();
    await safeFetch(fetchMock as unknown as typeof fetch, 'https://api.scaleway.com/x', { signal: caller.signal });

    expect(fetchMock.mock.calls[0]?.[1].signal?.aborted).toBe(true);
  });

  it('throws unauthorized when there is no session', async () => {
    const { http } = setup([]);
    const keeper = { current: async () => null, renew: jest.fn() } as unknown as SessionKeeper;
    const noSession = createScalewayHttp({ fetch: jest.fn() as unknown as typeof fetch, keeper });

    await expect(noSession.request('GET', '/a')).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(http).toBeDefined();
  });
});
