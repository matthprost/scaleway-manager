import { AppError } from '@scaleway-manager/core';

import type { Workspace } from '../workspace/useWorkspace';

// Scaleway refused it (403): this user may not see it, and trying again can't help
export const isRefused = (error: unknown) => error instanceof AppError && error.kind === 'forbidden';

// What an organization's data failing means for a screen: without the account there's no organization to ask about;
// otherwise the query's own error, always as an AppError.
export function queryFailure(workspace: Pick<Workspace, 'user' | 'status'>, error: Error | null): AppError | null {
  if (workspace.user === null && workspace.status === 'error') {
    return new AppError('unknown', "The account couldn't be loaded");
  }

  return error === null || error instanceof AppError ? error : new AppError('unknown', error.message);
}
