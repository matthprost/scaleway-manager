import { AppError } from '@scaleway-manager/core';
import type { AuthPort, Session } from '@scaleway-manager/core';

import { SCALEWAY_API_URL, SCALEWAY_LOGIN_URL } from './constants';
import { errorFromResponse, readJson, safeFetch } from './http';

type RenewResponse = {
  token: string;
  renew_token: string;
  jwt: { jti: string; audience_id: string; expires_at: string };
};

type CallbackPayload = {
  token: string;
  renewToken: string;
  jwt: { jti: string; audienceId: string; expiresAt: string };
};

const allStrings = (values: unknown[]) => values.every((value) => typeof value === 'string' && value !== '');

const invalidCallback = () => new AppError('unknown', 'Invalid login callback');

export const createScalewayAuth = (deps: { fetch: typeof fetch }): AuthPort => {
  const { fetch: fetchFn } = deps;

  return {
    loginUrl: (callbackUrl) => `${SCALEWAY_LOGIN_URL}?redirectToUrl=${encodeURIComponent(callbackUrl)}`,

    sessionFromCallback(callbackUrl) {
      const match = /[?&]token=([^&#]*)/.exec(callbackUrl);
      if (match?.[1] === undefined) {
        throw invalidCallback();
      }

      try {
        // A raw "+" may arrive as a space; put it back before decoding.
        const base64 = decodeURIComponent(match[1]).replace(/ /g, '+');
        const data = JSON.parse(atob(base64)) as CallbackPayload;
        if (!allStrings([data.token, data.renewToken, data.jwt?.jti, data.jwt?.audienceId, data.jwt?.expiresAt])) {
          throw invalidCallback();
        }

        return {
          token: data.token,
          renewToken: data.renewToken,
          sessionId: data.jwt.jti,
          userId: data.jwt.audienceId,
          expiresAt: data.jwt.expiresAt,
        };
      } catch {
        throw invalidCallback();
      }
    },

    async renew(session) {
      const response = await safeFetch(fetchFn, `${SCALEWAY_API_URL}/iam/v1alpha1/jwts/${encodeURIComponent(session.sessionId)}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renew_token: session.renewToken }),
      });
      if (!response.ok) {
        throw await errorFromResponse(response);
      }
      const data = (await readJson(response)) as RenewResponse;
      if (!allStrings([data?.token, data?.renew_token, data?.jwt?.jti, data?.jwt?.audience_id, data?.jwt?.expires_at])) {
        throw new AppError('unknown', 'Invalid renew response');
      }
      const renewed: Session = {
        token: data.token,
        renewToken: data.renew_token,
        sessionId: data.jwt.jti,
        userId: data.jwt.audience_id,
        expiresAt: data.jwt.expires_at,
      };

      return renewed;
    },

    async revoke(session) {
      const response = await safeFetch(fetchFn, `${SCALEWAY_API_URL}/iam/v1alpha1/jwts/${encodeURIComponent(session.sessionId)}`, {
        method: 'DELETE',
        headers: { 'X-Session-Token': session.token },
      });
      if (!response.ok) {
        throw await errorFromResponse(response);
      }
    },
  };
};
