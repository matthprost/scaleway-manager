import type { Health } from '@scaleway-manager/core';

// Why a resource's actions are all off when its status allows none of them (ActionGrid disabledReason; offline is
// said instead, first): "Wait until the server is ready" while it changes, "Not available right now" otherwise.
// Nothing while one can run: an action the status doesn't allow just stays in the grid, turned off.
export function statusReason(offered: readonly string[], health: Health, thing: string): string | undefined {
  if (offered.length > 0) {
    return undefined;
  }

  return health === 'busy' ? `Wait until the ${thing} is ready` : 'Not available right now';
}
