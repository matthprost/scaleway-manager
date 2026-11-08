import type { ClockPort } from '@scaleway-manager/core';

export const systemClock: ClockPort = { now: () => new Date() };
