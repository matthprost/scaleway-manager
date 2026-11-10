import type { Money } from './money';

export type Invoice = {
  id: string;
  number: number;
  periodStart: string;
  issuedAt: string;
  totalUntaxed: Money;
  state: string;
};
