import { AppError } from '@scaleway-manager/core';
import type { ClockPort } from '@scaleway-manager/core';

// Demo actions stay busy this long (two 3 s polls), then land on the final state.
export const BUSY_MS = 6_000;
export const MINUTE = 60_000;
export const DAY = 86_400_000;

export const notFound = (): AppError =>
  new AppError('not_found', 'This resource no longer exists.', 404);

type Pending<S> = { busy: S; final: S; at: number };
type StateBook<S> = {
  get: (id: string) => S | undefined;
  start: (id: string, busy: S, final: S) => void;
};

// Keeps each id's state. The state is worked out from the injected clock, never a timer.
export const createStateBook = <S>(clock: ClockPort, initial: Record<string, S>): StateBook<S> => {
  const settled = new Map<string, S>(Object.entries(initial));
  const pending = new Map<string, Pending<S>>();

  const get = (id: string): S | undefined => {
    const change = pending.get(id);

    if (change === undefined) {
      return settled.get(id);
    }
    if (clock.now().getTime() - change.at >= BUSY_MS) {
      settled.set(id, change.final);
      pending.delete(id);

      return change.final;
    }

    return change.busy;
  };

  const start = (id: string, busy: S, final: S): void => {
    get(id);
    pending.set(id, { busy, final, at: clock.now().getTime() });
  };

  return { get, start };
};
