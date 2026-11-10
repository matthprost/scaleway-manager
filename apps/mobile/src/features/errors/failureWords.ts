import { AppError } from '@scaleway-manager/core';
import type { AppErrorKind } from '@scaleway-manager/core';

import { ACTION_FAILED } from './ActionFailed';

// The bible's words for each kind of failure; nothing once the session ended (the app goes back to Welcome)
const FAILURE_WORDS: Record<AppErrorKind, string | null> = {
  offline: "You're offline. Connect to the internet and try again.",
  forbidden: "You don't have access to this in this organization.",
  not_found: "This doesn't exist anymore.",
  server: "Scaleway isn't responding right now. Try again in a moment.",
  unknown: ACTION_FAILED,
  unauthorized: null,
};

// What an action that failed says under it (ActionFailed). When Scaleway refuses the thing itself (400: a bad key,
// an organization rule; 409: one already there) and says why, its own reason, since trying again can't help.
// Otherwise plain words: never a technical message like "Request failed with status 409".
export function failureWords(error: unknown): string | null {
  if (!(error instanceof AppError)) {
    return ACTION_FAILED;
  }

  const refused = error.status === 400 || error.status === 409;

  return refused && error.reason !== undefined ? error.reason : FAILURE_WORDS[error.kind];
}
