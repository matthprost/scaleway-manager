import { AppError } from '@scaleway-manager/core';
import type { AppErrorKind, SessionKeeper } from '@scaleway-manager/core';

import { SCALEWAY_API_URL } from './constants';

export type ScalewayHttp = {
  request<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T>;
};

// A request that gets no answer within this time counts as offline.
const REQUEST_TIMEOUT_MS = 20_000;

// Runs fetch with a time limit; a network failure or timeout becomes AppError('offline').
export const safeFetch = async (fetchFn: typeof fetch, url: string, init: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // The caller can still cancel (leaving a screen), next to the time limit.
  const cancel = () => controller.abort();
  init.signal?.addEventListener('abort', cancel);
  if (init.signal?.aborted) {
    cancel();
  }
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } catch {
    throw new AppError('offline', 'Network request failed');
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', cancel);
  }
};

// Reads a JSON body; a non-JSON body becomes AppError('unknown').
export const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw new AppError('unknown', 'Invalid response from Scaleway', response.status);
  }
};

// Builds an AppError from a failed response. Scaleway's own words, when it gives some, are its `reason`: the help
// for the arguments it refused (details[].help_message), else its message.
export const errorFromResponse = async (response: Response): Promise<AppError> => {
  let reason: string | undefined;
  try {
    const data: unknown = await response.json();
    if (typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string') {
      reason = data.message.trim() === '' ? undefined : data.message;
    }
    if (typeof data === 'object' && data !== null && 'details' in data && Array.isArray(data.details)) {
      const help = data.details
        .map((detail: unknown) =>
          typeof detail === 'object' && detail !== null && 'help_message' in detail && typeof detail.help_message === 'string'
            ? detail.help_message.trim()
            : '',
        )
        .filter((line) => line !== '');
      if (help.length > 0) {
        reason = help.join(' ');
      }
    }
  } catch {
    // Body is not JSON: no words of Scaleway's.
  }

  let kind: AppErrorKind = 'unknown';
  if (response.status === 401) {
    kind = 'unauthorized';
  } else if (response.status === 403) {
    kind = 'forbidden';
  } else if (response.status === 404) {
    kind = 'not_found';
  } else if (response.status >= 500) {
    kind = 'server';
  }

  return new AppError(kind, reason ?? `Request failed with status ${response.status}`, response.status, reason);
};

export const createScalewayHttp = (deps: { fetch: typeof fetch; keeper: SessionKeeper }): ScalewayHttp => {
  const { fetch: fetchFn, keeper } = deps;

  const send = (method: string, path: string, token: string, body: unknown): Promise<Response> => {
    const headers: Record<string, string> = { 'X-Session-Token': token };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    return safeFetch(fetchFn, `${SCALEWAY_API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  return {
    async request<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
      const session = await keeper.current();
      if (session === null) {
        throw new AppError('unauthorized', 'No session');
      }

      let response = await send(method, path, session.token, body);
      if (response.status === 401) {
        const renewed = await keeper.renew();
        response = await send(method, path, renewed.token, body);
      }

      if (!response.ok) {
        throw await errorFromResponse(response);
      }
      if (response.status === 204) {
        return undefined as T;
      }

      return (await readJson(response)) as T;
    },
  };
};
