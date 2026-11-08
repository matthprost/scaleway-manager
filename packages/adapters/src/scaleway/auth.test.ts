import { AppError } from '@scaleway-manager/core';
import type { Session } from '@scaleway-manager/core';

import { createScalewayAuth } from './auth';

const session: Session = { token: 't-1', renewToken: 'r-1', sessionId: 'j-1', userId: 'u-1', expiresAt: '2026-11-06T10:00:00Z' };

const encode = (value: string) => btoa(value);

const payload = (extra = '') =>
  `{"jwt":{"audienceId":"u-1","issuerId":"i-1","jti":"j-1","expiresAt":"2026-11-06T10:00:00Z"},"renewToken":"r-1","token":"t-1"${extra}}`;

const noFetch = jest.fn() as unknown as typeof fetch;

const withFetch = (impl: () => Promise<Response>) => {
  const fetchMock = jest.fn((_url: string, _init: RequestInit) => impl());

  return { fetchMock, auth: createScalewayAuth({ fetch: fetchMock as unknown as typeof fetch }) };
};

describe('auth', () => {
  it('loginUrl encodes the callback', () => {
    const auth = createScalewayAuth({ fetch: noFetch });

    expect(auth.loginUrl('scalewaymanager://auth/callback')).toBe(
      'https://account.scaleway.com/authenticate?redirectToUrl=scalewaymanager%3A%2F%2Fauth%2Fcallback',
    );
  });

  it('sessionFromCallback decodes the CLI-format token', () => {
    const auth = createScalewayAuth({ fetch: noFetch });
    const url = `http://localhost:47815/callback?token=${encodeURIComponent(encode(payload()))}`;

    expect(auth.sessionFromCallback(url)).toEqual(session);
  });

  it('sessionFromCallback survives "+" turned into spaces', () => {
    const auth = createScalewayAuth({ fetch: noFetch });
    let padding = '';
    let encoded = encode(payload());
    for (let i = 0; i < 200 && !encoded.includes('+'); i += 1) {
      padding += '>';
      encoded = encode(payload(`,"pad":"${padding}"`));
    }
    expect(encoded.includes('+')).toBe(true);

    const url = `http://localhost:47815/callback?token=${encoded}`;

    expect(auth.sessionFromCallback(url)).toEqual(session);
    expect(auth.sessionFromCallback(`http://localhost:47815/callback?token=${encoded.replace(/\+/g, '%20')}`)).toEqual(session);
  });

  it('sessionFromCallback rejects a URL without a token', () => {
    const auth = createScalewayAuth({ fetch: noFetch });

    expect(() => auth.sessionFromCallback('http://localhost:47815/callback')).toThrow(AppError);
    expect(() => auth.sessionFromCallback('http://localhost:47815/callback')).toThrow(
      expect.objectContaining({ kind: 'unknown' }),
    );
  });

  it('sessionFromCallback rejects a token with missing fields', () => {
    const auth = createScalewayAuth({ fetch: noFetch });
    const bad = encode('{"jwt":{"jti":"j-1"},"renewToken":"r-1","token":"t-1"}');

    expect(() => auth.sessionFromCallback(`http://localhost:47815/callback?token=${bad}`)).toThrow(
      expect.objectContaining({ kind: 'unknown' }),
    );
  });

  it('renew rejects a response with missing fields', async () => {
    const { auth } = withFetch(async () => new Response('{"token":"t-2","jwt":{}}', { status: 200 }));

    await expect(auth.renew(session)).rejects.toMatchObject({ kind: 'unknown' });
  });

  it("renew maps the API's snake_case response", async () => {
    const { auth, fetchMock } = withFetch(async () =>
      new Response(
        JSON.stringify({
          token: 't-2',
          renew_token: 'r-2',
          jwt: { jti: 'j-1', audience_id: 'u-1', expires_at: '2026-11-06T11:00:00Z' },
        }),
        { status: 200 },
      ),
    );

    const renewed = await auth.renew(session);

    expect(renewed).toEqual({ token: 't-2', renewToken: 'r-2', sessionId: 'j-1', userId: 'u-1', expiresAt: '2026-11-06T11:00:00Z' });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.scaleway.com/iam/v1alpha1/jwts/j-1/renew');
    const init = fetchMock.mock.calls[0]?.[1] as unknown as { method: string; body: string };
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"renew_token":"r-1"}');
  });

  it('renew throws unauthorized on 401', async () => {
    const { auth } = withFetch(async () => new Response('{"message":"expired"}', { status: 401 }));

    await expect(auth.renew(session)).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('renew throws offline when fetch rejects', async () => {
    const { auth } = withFetch(async () => {
      throw new TypeError('Network request failed');
    });

    await expect(auth.renew(session)).rejects.toMatchObject({ kind: 'offline' });
  });

  it('revoke deletes the session with the token header', async () => {
    const { auth, fetchMock } = withFetch(async () => new Response(null, { status: 204 }));

    await auth.revoke(session);

    const init = fetchMock.mock.calls[0]?.[1] as unknown as { method: string; headers: Record<string, string> };
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.scaleway.com/iam/v1alpha1/jwts/j-1');
    expect(init.method).toBe('DELETE');
    expect(init.headers['X-Session-Token']).toBe('t-1');
  });

  it('a session id is encoded in the renew and revoke paths', async () => {
    const { auth, fetchMock } = withFetch(async () => new Response('{}', { status: 200 }));
    const odd: Session = { ...session, sessionId: 'a/../b?x=1' };

    await auth.renew(odd).catch(() => undefined);
    await auth.revoke(odd);

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      'https://api.scaleway.com/iam/v1alpha1/jwts/a%2F..%2Fb%3Fx%3D1/renew',
      'https://api.scaleway.com/iam/v1alpha1/jwts/a%2F..%2Fb%3Fx%3D1',
    ]);
  });
});
